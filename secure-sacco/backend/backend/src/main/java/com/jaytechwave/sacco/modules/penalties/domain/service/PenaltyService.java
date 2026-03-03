package com.jaytechwave.sacco.modules.penalties.domain.service;

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
}