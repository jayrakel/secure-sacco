package com.jaytechwave.sacco.modules.expense.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntry;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntryLine;
import com.jaytechwave.sacco.modules.accounting.domain.repository.AccountRepository;
import com.jaytechwave.sacco.modules.accounting.domain.repository.JournalEntryRepository;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.core.notifications.SmsNotificationService;
import com.jaytechwave.sacco.modules.expense.api.dto.ExpenseClaimDTOs.ExpenseAllocationDTO;
import com.jaytechwave.sacco.modules.expense.api.dto.ExpenseClaimDTOs.ExpenseClaimResponse;
import com.jaytechwave.sacco.modules.expense.api.dto.ExpenseClaimDTOs.ReviewExpenseClaimRequest;
import com.jaytechwave.sacco.modules.expense.api.dto.ExpenseClaimDTOs.SubmitExpenseClaimRequest;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaim;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaimAllocation;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaimStatus;
import com.jaytechwave.sacco.modules.expense.domain.repository.ExpenseClaimAllocationRepository;
import com.jaytechwave.sacco.modules.expense.domain.repository.ExpenseClaimRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.DepositAllocationRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.service.DepositAllocationRouterService;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Adversarial Stress & Invariance Test Suite for Milestone 1 Accounting Logic.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Adversarial Stress Testing — Milestone 1 Accounting & Claims Logic")
public class ExpenseClaimAdversarialStressTest {

    @Mock private ExpenseClaimRepository expenseClaimRepository;
    @Mock private ExpenseClaimAllocationRepository allocationRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private JournalEntryService journalEntryService;
    @Mock private SecurityAuditService securityAuditService;
    @Mock private SavingsService savingsService;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentProductRepository productRepository;
    @Mock private DepositAllocationRepository depositAllocationRepository;
    @Mock private DepositAllocationRouterService depositAllocationRouterService;
    @Mock private SmsNotificationService smsNotificationService;

    @InjectMocks
    private ExpenseClaimService expenseClaimService;

    private final UUID memberId = UUID.randomUUID();
    private final UUID reviewerId = UUID.randomUUID();
    private final UUID claimId = UUID.randomUUID();
    private final String staffEmail = "auditor@sacco.co.ke";

    private Member activeMember;
    private User reviewerUser;

    @BeforeEach
    void setUp() {
        activeMember = Member.builder()
                .id(memberId)
                .memberNumber("MBR-ADV-001")
                .firstName("Adversarial")
                .lastName("Tester")
                .phoneNumber("254700000001")
                .status(MemberStatus.ACTIVE)
                .build();

        reviewerUser = User.builder()
                .id(reviewerId)
                .email(staffEmail)
                .build();
    }

    // =========================================================================
    // 1. DOUBLE-ENTRY BALANCE INVARIANCE & FRACTIONAL PRECISION
    // =========================================================================

    @Test
    @DisplayName("Invariance: Fractional split (333.33 + 333.33 + 333.34 = 1000.00) preserves exact trial balance")
    void testFractionalSplit_preservesTrialBalance() {
        ExpenseClaim pendingClaim = ExpenseClaim.builder()
                .id(claimId)
                .memberId(memberId)
                .amount(new BigDecimal("1000.00"))
                .description("3-Way Fractional Split")
                .status(ExpenseClaimStatus.PENDING)
                .build();

        UUID prod1 = UUID.randomUUID();
        UUID prod2 = UUID.randomUUID();
        UUID prod3 = UUID.randomUUID();

        List<ExpenseAllocationDTO> allocations = List.of(
                new ExpenseAllocationDTO(prod1, new BigDecimal("333.33")),
                new ExpenseAllocationDTO(prod2, new BigDecimal("333.33")),
                new ExpenseAllocationDTO(prod3, new BigDecimal("333.34"))
        );

        PaymentProduct p1 = PaymentProduct.builder().id(prod1).code("SAV").name("Savings").build();
        PaymentProduct p2 = PaymentProduct.builder().id(prod2).code("SHR").name("Shares").build();
        PaymentProduct p3 = PaymentProduct.builder().id(prod3).code("DEP").name("Deposits").build();

        when(expenseClaimRepository.findById(claimId)).thenReturn(Optional.of(pendingClaim));
        when(userRepository.findByEmail(staffEmail)).thenReturn(Optional.of(reviewerUser));
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(productRepository.findById(prod1)).thenReturn(Optional.of(p1));
        when(productRepository.findById(prod2)).thenReturn(Optional.of(p2));
        when(productRepository.findById(prod3)).thenReturn(Optional.of(p3));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });
        when(expenseClaimRepository.save(any(ExpenseClaim.class))).thenAnswer(inv -> inv.getArgument(0));

        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(true, null, allocations);
        ExpenseClaimResponse response = expenseClaimService.reviewClaim(claimId, request, staffEmail, "10.0.0.1");

        assertThat(response.status()).isEqualTo("APPROVED");

        // Verify that exact reclassification GL amount posted matches the claim amount
        verify(journalEntryService).postExpenseReimbursementReclassification(
                eq(memberId), eq(new BigDecimal("1000.00")), eq(claimId.toString())
        );

        // Verify payment amount matches exactly
        verify(paymentRepository).save(argThat(p -> p.getAmount().compareTo(new BigDecimal("1000.00")) == 0));
    }

    // =========================================================================
    // 2. ALLOCATION BOUNDARY & SUM MISMATCHES
    // =========================================================================

    @Test
    @DisplayName("Boundary: Off-by-one-cent sum mismatch (500.00 + 499.99 = 999.99 for 1000.00) is rejected")
    void testAllocationSumMismatch_offByOneCent_rejected() {
        UUID prod1 = UUID.randomUUID();
        UUID prod2 = UUID.randomUUID();
        List<ExpenseAllocationDTO> allocations = List.of(
                new ExpenseAllocationDTO(prod1, new BigDecimal("500.00")),
                new ExpenseAllocationDTO(prod2, new BigDecimal("499.99"))
        );
        SubmitExpenseClaimRequest request = new SubmitExpenseClaimRequest(
                memberId, new BigDecimal("1000.00"), "Printer toner", "RCP-999", allocations
        );

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));

        assertThatThrownBy(() -> expenseClaimService.submitClaim(request, staffEmail))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Total allocation amount (999.99) does not match claim amount (1000.00)");

        verify(expenseClaimRepository, never()).save(any());
        verify(allocationRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("Boundary: Over-allocation by one cent (500.00 + 500.01 = 1000.01 for 1000.00) is rejected")
    void testAllocationSumMismatch_overAllocation_rejected() {
        UUID prod1 = UUID.randomUUID();
        UUID prod2 = UUID.randomUUID();
        List<ExpenseAllocationDTO> allocations = List.of(
                new ExpenseAllocationDTO(prod1, new BigDecimal("500.00")),
                new ExpenseAllocationDTO(prod2, new BigDecimal("500.01"))
        );
        SubmitExpenseClaimRequest request = new SubmitExpenseClaimRequest(
                memberId, new BigDecimal("1000.00"), "Printer toner", "RCP-1001", allocations
        );

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));

        assertThatThrownBy(() -> expenseClaimService.submitClaim(request, staffEmail))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Total allocation amount (1000.01) does not match claim amount (1000.00)");

        verify(expenseClaimRepository, never()).save(any());
    }

    // =========================================================================
    // 3. IDEMPOTENCY & RE-REVIEW GUARDS
    // =========================================================================

    @Test
    @DisplayName("Idempotency: Re-reviewing an already APPROVED claim throws IllegalStateException")
    void testReviewClaim_alreadyApproved_reReviewFails() {
        ExpenseClaim approvedClaim = ExpenseClaim.builder()
                .id(claimId)
                .memberId(memberId)
                .amount(new BigDecimal("1500.00"))
                .status(ExpenseClaimStatus.APPROVED)
                .build();

        when(expenseClaimRepository.findById(claimId)).thenReturn(Optional.of(approvedClaim));

        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(true, null, null);

        assertThatThrownBy(() -> expenseClaimService.reviewClaim(claimId, request, staffEmail, "127.0.0.1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only PENDING claims can be reviewed");

        verify(savingsService, never()).creditExpenseReimbursement(any(), any(), any());
        verify(journalEntryService, never()).postExpenseReimbursementClaim(any(), any(), any());
    }

    @Test
    @DisplayName("Idempotency: Re-reviewing an already REJECTED claim throws IllegalStateException")
    void testReviewClaim_alreadyRejected_reReviewFails() {
        ExpenseClaim rejectedClaim = ExpenseClaim.builder()
                .id(claimId)
                .memberId(memberId)
                .amount(new BigDecimal("1500.00"))
                .status(ExpenseClaimStatus.REJECTED)
                .build();

        when(expenseClaimRepository.findById(claimId)).thenReturn(Optional.of(rejectedClaim));

        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(true, null, null);

        assertThatThrownBy(() -> expenseClaimService.reviewClaim(claimId, request, staffEmail, "127.0.0.1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only PENDING claims can be reviewed");
    }

    // =========================================================================
    // 4. ADVERSARIAL FINDING: POTENTIAL VULNERABILITY IN RECEIPT REFERENCE SHARING
    // =========================================================================

    @Test
    @DisplayName("Stress: Split routing creates virtual Payment with claim receiptReference as mpesaRef")
    void testReviewClaim_virtualPaymentMpesaRefMapping() {
        // Demonstrating that when receiptReference is passed, virtualPayment has mpesaRef populated
        ExpenseClaim pendingClaim = ExpenseClaim.builder()
                .id(claimId)
                .memberId(memberId)
                .amount(new BigDecimal("500.00"))
                .receiptReference("MANUAL-RECEIPT-42")
                .status(ExpenseClaimStatus.PENDING)
                .build();

        UUID prod1 = UUID.randomUUID();
        PaymentProduct p1 = PaymentProduct.builder().id(prod1).code("SAV").name("Savings").build();
        List<ExpenseAllocationDTO> allocations = List.of(new ExpenseAllocationDTO(prod1, new BigDecimal("500.00")));

        when(expenseClaimRepository.findById(claimId)).thenReturn(Optional.of(pendingClaim));
        when(userRepository.findByEmail(staffEmail)).thenReturn(Optional.of(reviewerUser));
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(productRepository.findById(prod1)).thenReturn(Optional.of(p1));
        when(expenseClaimRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        when(paymentRepository.save(paymentCaptor.capture())).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(true, null, allocations);
        expenseClaimService.reviewClaim(claimId, request, staffEmail, "127.0.0.1");

        Payment capturedPayment = paymentCaptor.getValue();
        assertThat(capturedPayment.getMpesaRef()).isEqualTo("MANUAL-RECEIPT-42");
        assertThat(capturedPayment.getInternalRef()).isEqualTo("EXP-" + claimId);
        // Note: DepositAllocationRouterService uses mpesaRef as baseRef if present.
        // If two members use the same manual receipt reference, baseRef collides.
    }
}
