package com.jaytechwave.sacco.modules.paymentproducts.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaim;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaimAllocation;
import com.jaytechwave.sacco.modules.expense.domain.repository.ExpenseClaimAllocationRepository;
import com.jaytechwave.sacco.modules.expense.domain.repository.ExpenseClaimRepository;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.DepositAllocation;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.DepositAllocationRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * SAC-264: admin tool — search by M-Pesa reference (or internal ref, for a
 * payment still awaiting confirmation) and see EVERY route it was split
 * across — savings, penalty, loan, custom products — side by side, all
 * sharing one reference. Answers "where did this exact deposit go?" without
 * having to check the Savings log, Penalties page, Loans page, and every
 * Payment Products tab separately.
 */
@Service
@RequiredArgsConstructor
public class PaymentLookupService {

    private final PaymentRepository           paymentRepository;
    private final DepositAllocationRepository allocationRepository;
    private final MemberRepository            memberRepository;
    private final ExpenseClaimRepository      expenseClaimRepository;
    private final ExpenseClaimAllocationRepository expenseAllocationRepository;
    private final PaymentProductRepository    productRepository;

    @Transactional(readOnly = true)
    public Optional<PaymentRouteLookupResponse> lookupByReference(String reference) {
        if (reference == null || reference.isBlank()) return Optional.empty();
        String trimmed = reference.trim();

        Payment payment = paymentRepository.findByMpesaRef(trimmed)
                .or(() -> paymentRepository.findByInternalRef(trimmed))
                .or(() -> paymentRepository.findByTransactionRef(trimmed))
                .orElse(null);

        if (payment == null) {
            // Fallback: search for ExpenseClaim by receiptReference
            Optional<ExpenseClaim> optClaim = expenseClaimRepository.findFirstByReceiptReferenceOrderByCreatedAtDesc(trimmed);
            if (optClaim.isEmpty()) {
                return Optional.empty();
            }
            
            ExpenseClaim claim = optClaim.get();
            Member member = memberRepository.findById(claim.getMemberId()).orElse(null);
            
            List<ExpenseClaimAllocation> allocations = expenseAllocationRepository.findByExpenseClaimId(claim.getId());
            
            List<RouteItem> routes = allocations.stream().map(a -> {
                var product = productRepository.findById(a.getProductId()).orElse(null);
                return new RouteItem(
                        product != null ? product.getName() : "Unknown",
                        product != null ? product.getModuleType() : com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType.CUSTOM,
                        a.getAmount(),
                        claim.getStatus().name(),
                        claim.getRejectionReason(),
                        claim.getReviewedAt()
                );
            }).collect(java.util.stream.Collectors.toList());
            
            return Optional.of(new PaymentRouteLookupResponse(
                    claim.getId(),
                    claim.getReceiptReference(),
                    "EXP-" + claim.getId(),
                    member != null ? member.getMemberNumber() : null,
                    member != null ? (member.getFirstName() + " " + member.getLastName()) : "Unknown",
                    member != null ? member.getPhoneNumber() : null,
                    claim.getAmount(),
                    claim.getStatus().name(),
                    claim.getRejectionReason(),
                    claim.getCreatedAt(),
                    !allocations.isEmpty(),
                    routes
            ));
        }

        Member member = payment.getMemberId() != null
                ? memberRepository.findById(payment.getMemberId()).orElse(null)
                : null;

        List<DepositAllocation> allocations = allocationRepository.findByPaymentId(payment.getId());
        boolean isSplit = !allocations.isEmpty();

        List<RouteItem> routes = allocations.stream()
                .map(a -> new RouteItem(
                        a.getProduct().getName(),
                        a.getProduct().getModuleType(),
                        a.getAmount(),
                        a.getStatus().name(),
                        a.getFailureReason(),
                        a.getRoutedAt()
                ))
                .toList();

        return Optional.of(new PaymentRouteLookupResponse(
                payment.getId(),
                payment.getMpesaRef(),
                payment.getInternalRef(),
                member != null ? member.getMemberNumber() : null,
                member != null ? (member.getFirstName() + " " + member.getLastName()) : "Unknown",
                payment.getSenderPhoneNumber(),
                payment.getAmount(),
                payment.getStatus().name(),
                payment.getFailureReason(),
                payment.getCreatedAt(),
                isSplit,
                routes
        ));
    }
}