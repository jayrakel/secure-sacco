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
        // SAC-263: pure M-Pesa ref (or internalRef fallback) — no per-product suffix.
        // savings_transactions.reference / penalty_repayments.receipt_number / loan's
        // equivalent field all end up holding this EXACT value, matching the bank
        // statement/member's phone confirmation for easy auditing. No collision risk
        // across modules since each module's own GL reference_number already carries
        // a distinct prefix internally (bare for savings, PENREP- for penalty, LNREP-
        // for loan) — only same-module repeats would collide, and only CUSTOM can have
        // more than one allocation of the same module type per payment, handled below
        // by batching into a single journal entry instead of one per product.
        String baseRef = payment.getMpesaRef() != null ? payment.getMpesaRef() : payment.getInternalRef();

        List<DepositAllocation> customAllocations = new java.util.ArrayList<>();

        for (DepositAllocation allocation : allocations) {
            if (allocation.getStatus() != AllocationStatus.PENDING) continue; // already routed/failed

            PaymentProduct product = allocation.getProduct();

            if (product.getModuleType() == ModuleType.CUSTOM) {
                // Defer — all CUSTOM allocations for this payment post as ONE journal
                // entry below, so two custom products in the same split never try to
                // reuse the same reference_number on two separate entries.
                customAllocations.add(allocation);
                continue;
            }

            try {
                switch (product.getModuleType()) {
                    case SAVINGS -> routeToSavings(memberId, allocation, baseRef, payment);
                    case PENALTY -> routeToPenalty(memberId, allocation, baseRef);
                    case LOAN    -> routeToLoan(memberId, allocation, baseRef);
                    default -> { /* unreachable — CUSTOM handled above */ }
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

        if (!customAllocations.isEmpty()) {
            routeCustomBatch(memberId, customAllocations, baseRef);
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

    /**
     * SAC-263: all CUSTOM-type allocations for one payment post as a SINGLE journal
     * entry — one debit line for the combined custom amount, one credit line per
     * product. This is both correct double-entry practice (the underlying M-Pesa
     * receipt is one atomic event) and avoids two custom products in the same split
     * ever needing two entries under the same reference_number.
     */
    private void routeCustomBatch(UUID memberId, List<DepositAllocation> customAllocations, String baseRef) {
        java.math.BigDecimal totalCustomAmount = customAllocations.stream()
                .map(DepositAllocation::getAmount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        List<JournalEntryLineRequest> lines = new java.util.ArrayList<>();
        lines.add(new JournalEntryLineRequest("1001", memberId, totalCustomAmount,
                java.math.BigDecimal.ZERO, "Bank receipt — contributions"));

        for (DepositAllocation allocation : customAllocations) {
            PaymentProduct product = allocation.getProduct();
            lines.add(new JournalEntryLineRequest(product.getGlAccount().getAccountCode(), memberId,
                    java.math.BigDecimal.ZERO, allocation.getAmount(),
                    product.getName() + " contribution"));
        }

        try {
            journalEntryService.postEntry(new CreateJournalEntryRequest(
                    java.time.LocalDate.now(SaccoDateUtils.NAIROBI),
                    "PRODUCT-" + baseRef,
                    "Custom product contribution(s) via M-Pesa",
                    lines
            ));

            for (DepositAllocation allocation : customAllocations) {
                allocation.setStatus(AllocationStatus.ROUTED);
                allocation.setRoutedAt(ZonedDateTime.now(SaccoDateUtils.NAIROBI));
            }
            allocationRepository.saveAll(customAllocations);

            log.info("Routed {} custom allocation(s) as one batched entry — KES {} for member {} ref={}",
                    customAllocations.size(), totalCustomAmount, memberId, baseRef);
        } catch (Exception e) {
            for (DepositAllocation allocation : customAllocations) {
                allocation.setStatus(AllocationStatus.FAILED);
                allocation.setFailureReason(e.getMessage());
            }
            allocationRepository.saveAll(customAllocations);
            log.error("Failed to route batched custom allocations for member {} ref={}: {}",
                    memberId, baseRef, e.getMessage(), e);
        }
    }
}