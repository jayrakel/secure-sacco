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
import java.math.BigDecimal;

import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsTransaction;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.shares.domain.entity.ShareTransaction;
import com.jaytechwave.sacco.modules.shares.domain.repository.ShareTransactionRepository;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanRepayment;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanRepaymentRepository;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyRepayment;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepaymentRepository;
import java.util.ArrayList;


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

    private final SavingsTransactionRepository savingsTransactionRepository;
    private final SavingsAccountRepository savingsAccountRepository;
    private final ShareTransactionRepository shareTransactionRepository;
    private final LoanRepaymentRepository loanRepaymentRepository;
    private final PenaltyRepaymentRepository penaltyRepaymentRepository;


    @Transactional(readOnly = true)
    public Optional<PaymentRouteLookupResponse> lookupByReference(String reference) {
        if (reference == null || reference.isBlank()) return Optional.empty();
        String trimmed = reference.trim();

        Payment payment = paymentRepository.findByMpesaRef(trimmed)
                .or(() -> paymentRepository.findByInternalRef(trimmed))
                .or(() -> paymentRepository.findByTransactionRef(trimmed))
                .orElse(null);

        if (payment == null) {
            // Fallback 1: search for ExpenseClaim by receiptReference
            Optional<ExpenseClaim> optClaim = expenseClaimRepository.findFirstByReceiptReferenceOrderByCreatedAtDesc(trimmed);
            if (optClaim.isPresent()) {
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
            
            // Fallback 2: Historical Migrations
            List<RouteItem> migrationRoutes = new ArrayList<>();
            java.util.UUID memberId = null;
            BigDecimal totalAmount = BigDecimal.ZERO;
            java.time.ZonedDateTime createdAt = null;
            
            Optional<SavingsTransaction> optSav = savingsTransactionRepository.findByReference(trimmed);
            if (optSav.isPresent()) {
                SavingsTransaction st = optSav.get();
                var acc = savingsAccountRepository.findById(st.getSavingsAccountId()).orElse(null);
                if (acc != null) memberId = acc.getMemberId();
                totalAmount = totalAmount.add(st.getAmount());
                if (createdAt == null) createdAt = st.getCreatedAt().atZone(java.time.ZoneId.systemDefault());
                migrationRoutes.add(new RouteItem("Savings", com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType.SAVINGS, st.getAmount(), "COMPLETED", null, st.getCreatedAt().atZone(java.time.ZoneId.systemDefault())));
            }
            
            Optional<ShareTransaction> optShare = shareTransactionRepository.findFirstByReference(trimmed);
            if (optShare.isPresent()) {
                ShareTransaction st = optShare.get();
                memberId = st.getAccount().getMember().getId();
                totalAmount = totalAmount.add(st.getAmount());
                if (createdAt == null) createdAt = st.getCreatedAt().toZonedDateTime();
                migrationRoutes.add(new RouteItem("Shares", com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType.SHARE_CAPITAL, st.getAmount(), "COMPLETED", null, st.getCreatedAt().toZonedDateTime()));
            }
            
            Optional<LoanRepayment> optLoan = loanRepaymentRepository.findByReceiptNumber(trimmed);
            if (optLoan.isPresent()) {
                LoanRepayment lr = optLoan.get();
                memberId = lr.getLoanApplication().getMemberId();
                totalAmount = totalAmount.add(lr.getAmount());
                if (createdAt == null) createdAt = lr.getCreatedAt().atZone(java.time.ZoneId.systemDefault());
                migrationRoutes.add(new RouteItem("Loan Repayment", com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType.LOAN, lr.getAmount(), lr.getStatus().name(), null, lr.getCreatedAt().atZone(java.time.ZoneId.systemDefault())));
            }
            
            Optional<PenaltyRepayment> optPenalty = penaltyRepaymentRepository.findFirstByReceiptNumber(trimmed);
            if (optPenalty.isPresent()) {
                PenaltyRepayment pr = optPenalty.get();
                memberId = pr.getMemberId();
                totalAmount = totalAmount.add(pr.getAmount());
                if (createdAt == null) createdAt = pr.getCreatedAt().atZone(java.time.ZoneId.systemDefault());
                migrationRoutes.add(new RouteItem("Penalty Repayment", com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType.PENALTY, pr.getAmount(), pr.getStatus().name(), null, pr.getCreatedAt().atZone(java.time.ZoneId.systemDefault())));
            }
            
            if (!migrationRoutes.isEmpty() && memberId != null) {
                Member member = memberRepository.findById(memberId).orElse(null);
                return Optional.of(new PaymentRouteLookupResponse(
                        java.util.UUID.randomUUID(), trimmed, "MIGRATION",
                        member != null ? member.getMemberNumber() : null,
                        member != null ? (member.getFirstName() + " " + member.getLastName()) : "Unknown",
                        member != null ? member.getPhoneNumber() : null,
                        totalAmount, "COMPLETED", null, createdAt,
                        migrationRoutes.size() > 1, migrationRoutes
                ));
            }

            return Optional.empty();
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