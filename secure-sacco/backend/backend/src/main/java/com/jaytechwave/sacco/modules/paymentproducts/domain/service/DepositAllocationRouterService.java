package com.jaytechwave.sacco.modules.paymentproducts.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.CreateJournalEntryRequest;
import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.JournalEntryLineRequest;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.core.util.SaccoDateUtils;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanRepayment;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanRepaymentStatus;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanRepaymentRepository;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanRepaymentService;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.AllocationStatus;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.DepositAllocation;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.DepositAllocationRepository;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyRepayment;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyRepaymentStatus;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepaymentRepository;
import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyRepaymentService;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Routes each {@link DepositAllocation} belonging to a now-COMPLETED {@link Payment}
 * to the correct module. Called once, from the payment-completed event handler,
 * after the parent payment has already been marked COMPLETED — never re-entrant
 * for the same payment (guarded by {@link DepositAllocationRepository#existsByPaymentId}
 * check in the caller, plus idempotent per-allocation routing here).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DepositAllocationRouterService {

    private final DepositAllocationRepository  allocationRepository;
    private final SavingsService               savingsService;
    private final PenaltyRepaymentRepository   penaltyRepaymentRepository;
    private final PenaltyRepaymentService      penaltyRepaymentService;
    private final LoanApplicationRepository    loanApplicationRepository;
    private final LoanRepaymentRepository      loanRepaymentRepository;
    private final LoanRepaymentService         loanRepaymentService;
    private final JournalEntryService          journalEntryService;

    @Transactional
    public void routeAllocations(Payment payment) {
        List<DepositAllocation> allocations = allocationRepository.findByPaymentId(payment.getId());
        if (allocations.isEmpty()) return; // not a split deposit — nothing to route

        UUID memberId = payment.getMemberId();
        String baseRef = payment.getMpesaRef() != null ? payment.getMpesaRef() : payment.getInternalRef();

        for (DepositAllocation allocation : allocations) {
            if (allocation.getStatus() != AllocationStatus.PENDING) continue; // already routed/failed

            PaymentProduct product = allocation.getProduct();
            String allocationRef = baseRef + "-" + product.getCode();

            try {
                switch (product.getModuleType()) {
                    case SAVINGS -> routeToSavings(memberId, allocation, allocationRef, payment);
                    case PENALTY -> routeToPenalty(memberId, allocation, allocationRef);
                    case LOAN    -> routeToLoan(memberId, allocation, allocationRef);
                    case CUSTOM  -> routeToCustom(memberId, allocation, allocationRef, product);
                }
                allocation.setStatus(AllocationStatus.ROUTED);
                allocation.setRoutedAt(ZonedDateTime.now(SaccoDateUtils.NAIROBI));
                allocationRepository.save(allocation);

                log.info("Routed allocation {} ({}) — KES {} for member {}",
                        allocation.getId(), product.getCode(), allocation.getAmount(), memberId);
            } catch (Exception e) {
                allocation.setStatus(AllocationStatus.FAILED);
                allocation.setFailureReason(e.getMessage());
                allocationRepository.save(allocation);
                log.error("Failed to route allocation {} ({}) for member {}: {}",
                        allocation.getId(), product.getCode(), memberId, e.getMessage(), e);
                // Continue routing remaining allocations — one failure shouldn't block the rest.
            }
        }
    }

    // ── Module handlers ───────────────────────────────────────────────────────

    private void routeToSavings(UUID memberId, DepositAllocation allocation, String ref, Payment payment) {
        savingsService.processMpesaPaybillDeposit(
                memberId, allocation.getAmount(), ref, payment.getSenderPhoneNumber()
        );
    }

    private void routeToPenalty(UUID memberId, DepositAllocation allocation, String ref) {
        PenaltyRepayment repayment = PenaltyRepayment.builder()
                .memberId(memberId)
                .amount(allocation.getAmount())
                .status(PenaltyRepaymentStatus.PENDING)
                .build();
        repayment = penaltyRepaymentRepository.save(repayment);
        penaltyRepaymentService.processCompletedRepayment(repayment.getId(), ref);
    }

    private void routeToLoan(UUID memberId, DepositAllocation allocation, String ref) {
        LoanApplication activeLoan = loanApplicationRepository
                .findFirstByMemberIdAndStatusOrderByCreatedAtDesc(memberId, LoanStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("No active loan found for member " + memberId));

        LoanRepayment repayment = LoanRepayment.builder()
                .loanApplication(activeLoan)
                .amount(allocation.getAmount())
                .status(LoanRepaymentStatus.PENDING)
                .build();
        repayment = loanRepaymentRepository.save(repayment);
        loanRepaymentService.processCompletedRepayment(repayment.getId(), ref);
    }

    /** CUSTOM products have no domain logic — just a clean GL credit to their configured account. */
    private void routeToCustom(UUID memberId, DepositAllocation allocation, String ref, PaymentProduct product) {
        journalEntryService.postEntry(new CreateJournalEntryRequest(
                java.time.LocalDate.now(SaccoDateUtils.NAIROBI),
                "PRODUCT-" + ref,
                product.getName() + " contribution via M-Pesa",
                List.of(
                        new JournalEntryLineRequest("1001", memberId, allocation.getAmount(),
                                java.math.BigDecimal.ZERO, "Bank receipt — " + product.getName()),
                        new JournalEntryLineRequest(product.getGlAccount().getAccountCode(), memberId,
                                java.math.BigDecimal.ZERO, allocation.getAmount(),
                                product.getName() + " contribution")
                )
        ));
    }
}