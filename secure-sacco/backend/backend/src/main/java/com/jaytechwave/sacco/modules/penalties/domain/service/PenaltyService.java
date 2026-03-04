package com.jaytechwave.sacco.modules.penalties.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltySummaryResponse;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.WaivePenaltyRequest;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.event.LoanInstallmentOverdueEvent;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.penalties.domain.entity.*;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyAccrualRepository;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PenaltyService {

    private final PenaltyRepository penaltyRepository;
    private final PenaltyAccrualRepository penaltyAccrualRepository;
    private final PenaltyRuleRepository penaltyRuleRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final JournalEntryService journalEntryService;
    private final UserRepository userRepository;
    private final SecurityAuditService securityAuditService;

    @Transactional
    public void applyMissedInstallmentPenalty(LoanInstallmentOverdueEvent event) {
        // 1. STRICT IDEMPOTENCY CHECK
        String idempotencyKey = "MISS-" + event.scheduleItemId().toString();
        if (penaltyAccrualRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.info("Idempotency hit: Penalty already generated for schedule item {}", event.scheduleItemId());
            return;
        }

        PenaltyRule rule = penaltyRuleRepository.findByCode("LOAN_MISSED_INSTALLMENT")
                .filter(PenaltyRule::getIsActive).orElse(null);
        if (rule == null) return;

        LoanApplication app = loanApplicationRepository.findById(event.loanApplicationId()).orElseThrow();

        BigDecimal penaltyAmount = rule.getBaseAmountType() == AmountType.FIXED ?
                rule.getBaseAmountValue() :
                event.shortfallAmount().multiply(rule.getBaseAmountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        if (penaltyAmount.compareTo(BigDecimal.ZERO) <= 0) return;

        // 2. Create the Header
        Penalty penalty = Penalty.builder()
                .memberId(app.getMemberId())
                .referenceType("LOAN_APPLICATION")
                .referenceId(app.getId())
                .penaltyRule(rule)
                .originalAmount(penaltyAmount)
                .outstandingAmount(penaltyAmount)
                .status(PenaltyStatus.OPEN)
                .build();

        // 3. Create the Immutable Accrual Line Item
        UUID tempAccrualId = UUID.randomUUID(); // Generate early to strictly link the GL Journal
        PenaltyAccrual accrual = PenaltyAccrual.builder()
                .id(tempAccrualId)
                .accrualKind(AccrualKind.PRINCIPAL)
                .amount(penaltyAmount)
                .accruedAt(java.time.LocalDateTime.now())
                .idempotencyKey(idempotencyKey)
                .journalReference("PENC-" + tempAccrualId.toString())
                .build();

        penalty.addAccrual(accrual);
        penaltyRepository.save(penalty); // Cascade perfectly saves the accrual!

        // 4. Post to the GL to maintain immutable accounting
        journalEntryService.postPenaltyCreation(app.getMemberId(), penaltyAmount, tempAccrualId.toString());

        log.info("Applied ledger-backed {} penalty to Member {}. Amount: {}", rule.getCode(), app.getMemberId(), penaltyAmount);
    }

    @Transactional
    public void processPenaltyInterestAccruals() {
        List<Penalty> openPenalties = penaltyRepository.findByStatus(PenaltyStatus.OPEN);
        java.time.LocalDate today = java.time.LocalDate.now();

        for (Penalty penalty : openPenalties) {
            PenaltyRule rule = penalty.getPenaltyRule();

            // Skip if no interest is configured
            if (rule.getInterestMode() == InterestMode.NONE || rule.getInterestRate().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            // Find the date of the LAST interest accrual
            java.time.LocalDate lastAccrualDate = penalty.getAccruals().stream()
                    .filter(a -> a.getAccrualKind() == AccrualKind.INTEREST)
                    .map(a -> a.getAccruedAt().toLocalDate())
                    .max(java.time.LocalDate::compareTo)
                    .orElse(null);

            java.time.LocalDate targetDate;
            if (lastAccrualDate == null) {
                // First time interest: Wait for (Creation Date + Grace Period + Interest Period)
                targetDate = penalty.getCreatedAt().toLocalDate()
                        .plusDays(rule.getGracePeriodDays())
                        .plusDays(rule.getInterestPeriodDays());
            } else {
                // Subsequent interest: Wait for (Last Accrual + Interest Period)
                targetDate = lastAccrualDate.plusDays(rule.getInterestPeriodDays());
            }

            if (!today.isBefore(targetDate)) { // It's time!
                BigDecimal interestAmount;

                // MATH: Flat vs Compounding
                if (rule.getInterestMode() == InterestMode.FLAT) {
                    interestAmount = penalty.getOriginalAmount()
                            .multiply(rule.getInterestRate())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                } else { // COMPOUND
                    interestAmount = penalty.getOutstandingAmount()
                            .multiply(rule.getInterestRate())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                }

                if (interestAmount.compareTo(BigDecimal.ZERO) > 0) {
                    // STRICT IDEMPOTENCY: "INT-{penaltyId}-{targetDate}"
                    String idempotencyKey = "INT-" + penalty.getId().toString() + "-" + targetDate.toString();

                    if (!penaltyAccrualRepository.existsByIdempotencyKey(idempotencyKey)) {
                        UUID accrualId = UUID.randomUUID();
                        PenaltyAccrual accrual = PenaltyAccrual.builder()
                                .id(accrualId)
                                .accrualKind(AccrualKind.INTEREST)
                                .amount(interestAmount)
                                .accruedAt(java.time.LocalDateTime.now())
                                .idempotencyKey(idempotencyKey)
                                .journalReference("PENI-" + accrualId.toString())
                                .build();

                        penalty.addAccrual(accrual);
                        penalty.setOutstandingAmount(penalty.getOutstandingAmount().add(interestAmount));
                        penaltyRepository.save(penalty);

                        // Immutable double-entry GL update
                        journalEntryService.postPenaltyInterestAccrual(penalty.getMemberId(), interestAmount, accrualId.toString());

                        log.info("Accrued {} interest of {} for Penalty {}.", rule.getInterestMode(), interestAmount, penalty.getId());
                    }
                }
            }
        }
    }

    @Transactional
    public PenaltySummaryResponse waivePenalty(UUID penaltyId, WaivePenaltyRequest request, String email, String ipAddress) {
        User treasurer = userRepository.findByEmail(email).orElseThrow();
        Penalty penalty = penaltyRepository.findById(penaltyId)
                .orElseThrow(() -> new IllegalArgumentException("Penalty not found"));

        if (penalty.getStatus() == PenaltyStatus.PAID || penalty.getStatus() == PenaltyStatus.WAIVED) {
            throw new IllegalStateException("Cannot waive a penalty that is already fully Paid or Waived.");
        }

        if (request.amount().compareTo(penalty.getOutstandingAmount()) > 0) {
            throw new IllegalArgumentException("Waiver amount cannot exceed the current outstanding balance.");
        }

        // Apply Waiver
        penalty.setAmountWaived(penalty.getAmountWaived().add(request.amount()));
        penalty.setOutstandingAmount(penalty.getOutstandingAmount().subtract(request.amount()));

        if (penalty.getOutstandingAmount().compareTo(BigDecimal.ZERO) == 0) {
            penalty.setStatus(PenaltyStatus.WAIVED);
        }
        penaltyRepository.save(penalty);

        // 1. Immutable Accounting Reversal
        journalEntryService.postPenaltyWaiver(penalty.getMemberId(), request.amount(), penalty.getId().toString());

        // 2. Strict Security Audit Log
        securityAuditService.logEventWithActorAndIp(
                email,
                "WAIVE_PENALTY",
                "PENALTY-" + penalty.getId().toString(),
                ipAddress,
                String.format("Waived %s KES. Reason: %s", request.amount(), request.reason())
        );

        log.info("Penalty {} waived by amount {} by user {}. Reason: {}", penalty.getId(), request.amount(), email, request.reason());

        return new PenaltySummaryResponse(
                penalty.getId(), penalty.getPenaltyRule().getCode(), penalty.getPenaltyRule().getName(),
                penalty.getOriginalAmount(), penalty.getOutstandingAmount(), penalty.getPrincipalPaid(),
                penalty.getInterestPaid(), penalty.getAmountWaived(), penalty.getStatus().name(), penalty.getCreatedAt()
        );
    }
}