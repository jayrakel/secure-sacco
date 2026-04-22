package com.jaytechwave.sacco.modules.obligations.domain.service;

import com.jaytechwave.sacco.modules.core.util.SaccoDateUtils;
import com.jaytechwave.sacco.modules.obligations.api.dto.ObligationDTOs.ObligationPeriodResponse;
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
import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ObligationPeriodService {

    private final SavingsObligationRepository        obligationRepository;
    private final SavingsObligationPeriodRepository  periodRepository;
    private final SavingsAccountRepository           savingsAccountRepository;
    private final SavingsTransactionRepository       transactionRepository;
    private final PenaltyRuleRepository              penaltyRuleRepository;
    private final PenaltyRepository                  penaltyRepository;
    private final PenaltyAccrualRepository           accrualRepository;
    private final JournalEntryService                journalEntryService;
    private final SaccoSettingsService               settingsService;

    // ─── Public API ───────────────────────────────────────────────────────────

    public void evaluateAll() {
        List<SavingsObligation> active = obligationRepository.findByStatus(ObligationStatus.ACTIVE);
        log.info("ObligationEvaluation: evaluating {} obligations (all historical periods).", active.size());
        int totalOverdue = 0;
        for (SavingsObligation o : active) {
            try { totalOverdue += evaluateAllPeriods(o.getId()); }
            catch (Exception e) {
                log.error("ObligationEvaluation: failed for obligation {} (member {}): {}",
                        o.getId(), o.getMemberId(), e.getMessage(), e);
            }
        }
        log.info("ObligationEvaluation: complete. {} new OVERDUE periods.", totalOverdue);
    }

    @Transactional
    public int evaluateAllPeriods(UUID obligationId) {
        SavingsObligation obligation = obligationRepository.findById(obligationId)
                .orElseThrow(() -> new IllegalArgumentException("Obligation not found: " + obligationId));
        if (obligation.getStatus() == ObligationStatus.PAUSED) return 0;

        LocalDate today    = LocalDate.now(SaccoDateUtils.NAIROBI);
        LocalDateTime dl   = savingsDeadlineFor(today);
        int newOverdue     = 0;

        LocalDate cursor = obligation.getStartDate();
        while (!cursor.isAfter(today)) {
            LocalDate end = periodEndFor(obligation.getFrequency(), cursor);
            if (evaluatePeriodAt(obligation, cursor, end, today, dl)) newOverdue++;
            cursor = nextPeriodStart(obligation.getFrequency(), cursor);
        }
        return newOverdue;
    }

    @Transactional
    public boolean evaluateSingle(UUID obligationId) {
        return evaluateAllPeriods(obligationId) > 0;
    }

    public ObligationPeriodResponse enrich(ObligationPeriodResponse resp, boolean isCurrentPeriod) {
        penaltyRepository
                .findByReferenceTypeAndReferenceId("SAVINGS_OBLIGATION", resp.getId())
                .ifPresent(p -> {
                    resp.setPenaltyId(p.getId());
                    resp.setPenaltyAmount(p.getOriginalAmount());
                    resp.setPenaltyOutstanding(p.getOutstandingAmount());
                    resp.setPenaltyStatus(p.getStatus().name());
                });

        if (isCurrentPeriod && resp.getStatus() == PeriodStatus.DUE) {
            LocalDateTime now = LocalDateTime.now(SaccoDateUtils.NAIROBI);
            LocalDateTime dl  = savingsDeadlineFor(LocalDate.now(SaccoDateUtils.NAIROBI));
            resp.setComputedStatus(now.isBefore(dl) ? PeriodStatus.UPCOMING : PeriodStatus.DUE);
        } else {
            resp.setComputedStatus(resp.getStatus());
        }
        return resp;
    }

    // ─── Internal evaluation ─────────────────────────────────────────────────

    private boolean evaluatePeriodAt(SavingsObligation obligation,
                                     LocalDate periodStart, LocalDate periodEnd,
                                     LocalDate today, LocalDateTime deadline) {
        SavingsObligationPeriod period = periodRepository
                .findByObligationIdAndPeriodStart(obligation.getId(), periodStart)
                .orElseGet(() -> periodRepository.save(
                        SavingsObligationPeriod.builder()
                                .obligation(obligation)
                                .periodStart(periodStart)
                                .periodEnd(periodEnd)
                                .requiredAmount(obligation.getAmountDue())
                                .status(PeriodStatus.DUE)
                                .build()));

        BigDecimal paid = computePaidInPeriod(obligation.getMemberId(), periodStart, periodEnd);
        period.setPaidAmount(paid);

        boolean newOverdue = false;
        if (paid.compareTo(obligation.getAmountDue()) >= 0) {
            period.setStatus(PeriodStatus.COVERED);
        } else if (isPastDeadline(periodEnd, obligation.getGraceDays(), today, deadline)) {
            if (period.getStatus() != PeriodStatus.OVERDUE) {
                period.setStatus(PeriodStatus.OVERDUE);
                newOverdue = true;
                createMissedContributionPenalty(obligation, period);
            }
        }
        periodRepository.save(period);
        return newOverdue;
    }

    // ─── Schedule helpers ─────────────────────────────────────────────────────

    private LocalDateTime savingsDeadlineFor(LocalDate referenceDate) {
        DayOfWeek savingsDay = DayOfWeek.valueOf(settingsService.getSavingsDay());
        boolean   nextDay    = settingsService.isSavingsDeadlineNextDay();
        int       hour       = settingsService.getSavingsDeadlineHour();
        int       minute     = settingsService.getSavingsDeadlineMinute();

        LocalDate base = referenceDate;
        int lookback   = 7;
        while (base.getDayOfWeek() != savingsDay && lookback-- > 0) {
            base = base.minusDays(1);
        }
        if (nextDay) base = base.plusDays(1);
        return base.atTime(LocalTime.of(hour, minute, 59));
    }

    private boolean isPastDeadline(LocalDate periodEnd, int graceDays,
                                   LocalDate today, LocalDateTime deadline) {
        LocalDate cutoff = periodEnd.plusDays(graceDays);
        if (today.isAfter(cutoff))  return true;
        if (today.isEqual(cutoff))  return LocalDateTime.now(SaccoDateUtils.NAIROBI).isAfter(deadline);
        return false;
    }

    private LocalDate periodEndFor(ObligationFrequency freq, LocalDate start) {
        return freq == ObligationFrequency.WEEKLY ? start.plusDays(6) : start.plusMonths(1).minusDays(1);
    }

    private LocalDate nextPeriodStart(ObligationFrequency freq, LocalDate current) {
        return freq == ObligationFrequency.WEEKLY ? current.plusWeeks(1) : current.plusMonths(1);
    }

    LocalDate currentPeriodStart(SavingsObligation obligation, LocalDate today) {
        LocalDate start = obligation.getStartDate();
        if (today.isBefore(start)) return start;
        if (obligation.getFrequency() == ObligationFrequency.MONTHLY) {
            long months   = ChronoUnit.MONTHS.between(start, today);
            LocalDate calc = start.plusMonths(months);
            return calc.isAfter(today) ? calc.minusMonths(1) : calc;
        } else {
            long weeks    = ChronoUnit.WEEKS.between(start, today);
            LocalDate calc = start.plusWeeks(weeks);
            return calc.isAfter(today) ? calc.minusWeeks(1) : calc;
        }
    }

    // ─── Savings computation ──────────────────────────────────────────────────

    private BigDecimal computePaidInPeriod(UUID memberId, LocalDate start, LocalDate end) {
        return savingsAccountRepository.findByMemberId(memberId)
                .map(acct -> transactionRepository.sumDepositsBetween(
                        acct.getId(), start.atStartOfDay(), end.plusDays(1).atStartOfDay()))
                .orElse(BigDecimal.ZERO);
    }

    // ─── Penalty creation ─────────────────────────────────────────────────────

    private void createMissedContributionPenalty(SavingsObligation obligation, SavingsObligationPeriod period) {
        String idempotencyKey = "SAVE-MISS-" + period.getId();
        if (accrualRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.info("Idempotency hit: penalty already exists for period {}", period.getId());
            return;
        }

        Optional<PenaltyRule> ruleOpt = penaltyRuleRepository.findByCode("SAVINGS_DEFAULT")
                .filter(PenaltyRule::getIsActive);
        if (ruleOpt.isEmpty()) {
            ruleOpt = penaltyRuleRepository.findByCode("SAVINGS_MISSED_CONTRIBUTION")
                    .filter(PenaltyRule::getIsActive);
        }
        if (ruleOpt.isEmpty()) {
            log.warn("No active savings penalty rule — skipping period {}", period.getId());
            return;
        }

        PenaltyRule rule     = ruleOpt.get();
        BigDecimal shortfall = period.getRequiredAmount().subtract(period.getPaidAmount());
        BigDecimal amount    = rule.getBaseAmountType() == AmountType.FIXED
                ? rule.getBaseAmountValue()
                : shortfall.multiply(rule.getBaseAmountValue())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) return;

        Penalty penalty = Penalty.builder()
                .memberId(obligation.getMemberId())
                .referenceType("SAVINGS_OBLIGATION")
                .referenceId(period.getId())
                .penaltyRule(rule)
                .originalAmount(amount)
                .outstandingAmount(amount)
                .status(PenaltyStatus.OPEN)
                .build();

        UUID accrualId = UUID.randomUUID();
        PenaltyAccrual accrual = PenaltyAccrual.builder()
                // NOTE: No .id() — Hibernate treats a pre-set ID as a detached entity.
                .accrualKind(AccrualKind.PRINCIPAL)
                .amount(amount)
                .accruedAt(LocalDateTime.now(SaccoDateUtils.NAIROBI))
                .idempotencyKey(idempotencyKey)
                .journalReference("PENC-" + accrualId)
                .build();

        penalty.addAccrual(accrual);
        penaltyRepository.save(penalty);
        journalEntryService.postPenaltyCreation(obligation.getMemberId(), amount, accrualId.toString());
        log.info("Penalty KES {} created for member {} period {}", amount, obligation.getMemberId(), period.getId());
    }
}