package com.jaytechwave.sacco.modules.obligations.domain.service;

import com.jaytechwave.sacco.modules.obligations.domain.entity.*;
import com.jaytechwave.sacco.modules.obligations.domain.repository.SavingsObligationPeriodRepository;
import com.jaytechwave.sacco.modules.obligations.domain.repository.SavingsObligationRepository;
import com.jaytechwave.sacco.modules.penalties.domain.entity.*;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyAccrualRepository;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRuleRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Core obligation evaluation logic — separated from the scheduler so it can be
 * unit-tested and triggered manually via the admin endpoint.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ObligationPeriodService {

    private final SavingsObligationRepository     obligationRepository;
    private final SavingsObligationPeriodRepository periodRepository;
    private final SavingsAccountRepository        savingsAccountRepository;
    private final SavingsTransactionRepository    transactionRepository;
    private final PenaltyRuleRepository           penaltyRuleRepository;
    private final PenaltyRepository               penaltyRepository;
    private final PenaltyAccrualRepository        accrualRepository;
    private final JournalEntryService             journalEntryService;

    /**
     * Evaluates every ACTIVE obligation. Each obligation is committed in its own
     * transaction so a failure for one member does not roll back the full run.
     */
    public void evaluateAll() {
        List<SavingsObligation> active = obligationRepository.findByStatus(ObligationStatus.ACTIVE);
        log.info("ObligationEvaluation: evaluating {} active obligations.", active.size());
        int overdue = 0;
        for (SavingsObligation obligation : active) {
            try {
                boolean becameOverdue = evaluateSingle(obligation.getId());
                if (becameOverdue) overdue++;
            } catch (Exception e) {
                log.error("ObligationEvaluation: failed for obligation {} (member {}): {}",
                        obligation.getId(), obligation.getMemberId(), e.getMessage(), e);
            }
        }
        log.info("ObligationEvaluation: complete. {} new OVERDUE periods created.", overdue);
    }

    /**
     * Evaluates a single obligation. Returns true if a new OVERDUE period was created.
     * Runs in its own transaction — safe to call individually.
     */
    @Transactional
    public boolean evaluateSingle(UUID obligationId) {
        SavingsObligation obligation = obligationRepository.findById(obligationId)
                .orElseThrow(() -> new IllegalArgumentException("Obligation not found: " + obligationId));

        if (obligation.getStatus() == ObligationStatus.PAUSED) return false;

        LocalDate today = LocalDate.now();
        LocalDate periodStart = currentPeriodStart(obligation, today);

        // 🟢 FIX 1: Dynamically set the period end based on frequency so grace periods calculate correctly
        LocalDate periodEnd = obligation.getFrequency() == ObligationFrequency.WEEKLY
                ? periodStart.plusDays(6)
                : periodStart.plusMonths(1).minusDays(1);

        // Upsert the period row
        SavingsObligationPeriod period = periodRepository
                .findByObligationIdAndPeriodStart(obligationId, periodStart)
                .orElseGet(() -> {
                    SavingsObligationPeriod p = SavingsObligationPeriod.builder()
                            .obligation(obligation)
                            .periodStart(periodStart)
                            .periodEnd(periodEnd)
                            .requiredAmount(obligation.getAmountDue())
                            .status(PeriodStatus.DUE)
                            .build();
                    return periodRepository.save(p);
                });

        // Re-compute paid amount from actual savings transactions
        BigDecimal paid = computePaidInPeriod(obligation.getMemberId(), periodStart, periodEnd);
        period.setPaidAmount(paid);

        boolean newOverdue = false;

        if (paid.compareTo(obligation.getAmountDue()) >= 0) {
            period.setStatus(PeriodStatus.COVERED);
        } else if (today.isAfter(periodEnd.plusDays(obligation.getGraceDays()))) {
            // Period ended, grace expired, still short → OVERDUE
            if (period.getStatus() != PeriodStatus.OVERDUE) {
                period.setStatus(PeriodStatus.OVERDUE);
                newOverdue = true;
                createMissedContributionPenalty(obligation, period);
            }
        }

        periodRepository.save(period);
        return newOverdue;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Returns the start of the current period window based on frequency and start_date.
     * 🟢 FIX 2: Replaced the "Monday dictator" logic with code that respects the member's custom start date.
     */
    private LocalDate currentPeriodStart(SavingsObligation obligation, LocalDate today) {
        LocalDate start = obligation.getStartDate();
        if (today.isBefore(start)) return start;

        if (obligation.getFrequency() == ObligationFrequency.MONTHLY) {
            long months = ChronoUnit.MONTHS.between(start, today);
            LocalDate calcStart = start.plusMonths(months);
            return calcStart.isAfter(today) ? calcStart.minusMonths(1) : calcStart;
        } else {
            long weeks = ChronoUnit.WEEKS.between(start, today);
            LocalDate calcStart = start.plusWeeks(weeks);
            return calcStart.isAfter(today) ? calcStart.minusWeeks(1) : calcStart;
        }
    }

    /**
     * Sums DEPOSIT transactions on the member's savings account within the period window.
     * Only POSTED transactions are counted.
     */
    private BigDecimal computePaidInPeriod(UUID memberId, LocalDate periodStart, LocalDate periodEnd) {
        return savingsAccountRepository.findByMemberId(memberId)
                .map(account -> transactionRepository
                        .sumDepositsBetween(account.getId(), periodStart.atStartOfDay(), periodEnd.plusDays(1).atStartOfDay()))
                .orElse(BigDecimal.ZERO);
    }

    /**
     * Creates a SAVINGS_MISSED_CONTRIBUTION penalty. Idempotent — checks for an
     * existing accrual with the same idempotency key before creating.
     */
    private void createMissedContributionPenalty(SavingsObligation obligation, SavingsObligationPeriod period) {
        String idempotencyKey = "SAVE-MISS-" + period.getId();
        if (accrualRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.info("Idempotency hit: penalty already created for period {}", period.getId());
            return;
        }

        // 🟢 FIX 3: Looks for SAVINGS_DEFAULT so the Admin can customize it.
        // Falls back to the old string so we don't break existing data.
        Optional<PenaltyRule> ruleOpt = penaltyRuleRepository.findByCode("SAVINGS_DEFAULT")
                .filter(PenaltyRule::getIsActive);

        if (ruleOpt.isEmpty()) {
            ruleOpt = penaltyRuleRepository.findByCode("SAVINGS_MISSED_CONTRIBUTION")
                    .filter(PenaltyRule::getIsActive);
        }

        if (ruleOpt.isEmpty()) {
            log.warn("SAVINGS_MISSED_CONTRIBUTION penalty rule not found or inactive — skipping penalty for period {}",
                    period.getId());
            return;
        }

        PenaltyRule rule = ruleOpt.get();
        BigDecimal shortfall = period.getRequiredAmount().subtract(period.getPaidAmount());

        BigDecimal penaltyAmount = rule.getBaseAmountType() == AmountType.FIXED
                ? rule.getBaseAmountValue()
                : shortfall.multiply(rule.getBaseAmountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        if (penaltyAmount.compareTo(BigDecimal.ZERO) <= 0) return;

        Penalty penalty = Penalty.builder()
                .memberId(obligation.getMemberId())
                .referenceType("SAVINGS_OBLIGATION")
                .referenceId(period.getId())
                .penaltyRule(rule)
                .originalAmount(penaltyAmount)
                .outstandingAmount(penaltyAmount)
                .status(PenaltyStatus.OPEN)
                .build();

        UUID accrualId = UUID.randomUUID();
        PenaltyAccrual accrual = PenaltyAccrual.builder()
                .id(accrualId)
                .accrualKind(AccrualKind.PRINCIPAL)
                .amount(penaltyAmount)
                .accruedAt(java.time.LocalDateTime.now())
                .idempotencyKey(idempotencyKey)
                .journalReference("PENC-" + accrualId)
                .build();

        penalty.addAccrual(accrual);
        penaltyRepository.save(penalty);

        journalEntryService.postPenaltyCreation(obligation.getMemberId(), penaltyAmount, accrualId.toString());

        log.info("Created SAVINGS_MISSED_CONTRIBUTION penalty for member {} period {} amount {}",
                obligation.getMemberId(), period.getId(), penaltyAmount);
    }
}