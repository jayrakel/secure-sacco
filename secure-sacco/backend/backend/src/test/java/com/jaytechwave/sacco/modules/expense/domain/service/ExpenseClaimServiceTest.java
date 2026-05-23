package com.jaytechwave.sacco.modules.expense.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.expense.api.dto.ExpenseClaimDTOs.*;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaim;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaimStatus;
import com.jaytechwave.sacco.modules.expense.domain.repository.ExpenseClaimRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Service-level unit tests for {@link ExpenseClaimService} (SAC-220).
 *
 * <p>Key assertions:
 * <ul>
 *   <li>Claim submission creates a PENDING record — no GL entry.
 *   <li>Approval posts exactly one GL journal entry via {@link JournalEntryService}.
 *   <li>Rejection posts zero GL journal entries.
 *   <li>Reviewing a non-PENDING claim throws {@link IllegalStateException}.
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class ExpenseClaimServiceTest {

    @Mock private ExpenseClaimRepository expenseClaimRepository;
    @Mock private MemberRepository       memberRepository;
    @Mock private UserRepository         userRepository;
    @Mock private JournalEntryService    journalEntryService;
    @Mock private SecurityAuditService   securityAuditService;

    @InjectMocks
    private ExpenseClaimService expenseClaimService;

    // ── Test fixtures ─────────────────────────────────────────────────────────

    private final UUID   memberId   = UUID.randomUUID();
    private final UUID   reviewerId = UUID.randomUUID();
    private final UUID   claimId    = UUID.randomUUID();
    private final String staffEmail = "treasurer@sacco.co.ke";

    private Member activeMember;
    private User   reviewerUser;

    @BeforeEach
    void setUp() {
        activeMember = Member.builder()
                .id(memberId)
                .memberNumber("MBR-001")
                .firstName("Jane")
                .lastName("Doe")
                .status(MemberStatus.ACTIVE)
                .build();

        reviewerUser = User.builder()
                .id(reviewerId)
                .email(staffEmail)
                .build();
    }

    // ── submitClaim ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("submitClaim: creates a PENDING claim — no GL entry posted")
    void testSubmitClaim_success_noglEntry() {
        // Arrange
        SubmitExpenseClaimRequest request = new SubmitExpenseClaimRequest(
                memberId, new BigDecimal("500.00"), "Bought printer paper", "RCP-001"
        );

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));

        ExpenseClaim savedClaim = ExpenseClaim.builder()
                .id(claimId)
                .memberId(memberId)
                .amount(request.amount())
                .description(request.description())
                .receiptReference(request.receiptReference())
                .status(ExpenseClaimStatus.PENDING)
                .build();

        when(expenseClaimRepository.save(any(ExpenseClaim.class))).thenReturn(savedClaim);

        // Act
        ExpenseClaimResponse response = expenseClaimService.submitClaim(request, staffEmail);

        // Assert
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.amount()).isEqualByComparingTo("500.00");
        assertThat(response.memberNumber()).isEqualTo("MBR-001");

        // CRITICAL: No GL entry must be created at submission time
        verify(journalEntryService, never()).postExpenseReimbursementClaim(any(), any(), any());
        verify(securityAuditService).logEvent(eq("EXPENSE_CLAIM_SUBMITTED"), anyString(), anyString());
    }

    @Test
    @DisplayName("submitClaim: throws when member is not ACTIVE")
    void testSubmitClaim_inactiveMember_throws() {
        activeMember.setStatus(MemberStatus.INACTIVE);
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));

        SubmitExpenseClaimRequest request = new SubmitExpenseClaimRequest(
                memberId, new BigDecimal("200.00"), "Stationery", null
        );

        assertThatThrownBy(() -> expenseClaimService.submitClaim(request, staffEmail))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ACTIVE");

        verify(expenseClaimRepository, never()).save(any());
    }

    // ── reviewClaim: APPROVED ─────────────────────────────────────────────────

    @Test
    @DisplayName("reviewClaim: APPROVE — posts exactly one GL journal entry")
    void testReviewClaim_approve_postsJournalEntry() {
        // Arrange: a PENDING claim exists
        ExpenseClaim pendingClaim = ExpenseClaim.builder()
                .id(claimId)
                .memberId(memberId)
                .amount(new BigDecimal("750.00"))
                .description("Office cleaning fee")
                .status(ExpenseClaimStatus.PENDING)
                .build();

        when(expenseClaimRepository.findById(claimId)).thenReturn(Optional.of(pendingClaim));
        when(userRepository.findByEmail(staffEmail)).thenReturn(Optional.of(reviewerUser));
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(expenseClaimRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(true, null);

        // Act
        ExpenseClaimResponse response = expenseClaimService.reviewClaim(claimId, request, staffEmail, "127.0.0.1");

        // Assert
        assertThat(response.status()).isEqualTo("APPROVED");
        assertThat(response.journalReference()).isEqualTo("EXP-" + claimId);

        // CRITICAL: exactly one GL entry must be posted
        verify(journalEntryService, times(1))
                .postExpenseReimbursementClaim(memberId, new BigDecimal("750.00"), claimId.toString());

        verify(securityAuditService).logEventWithActorAndIp(
                eq(staffEmail), eq("EXPENSE_CLAIM_APPROVED"), anyString(), eq("127.0.0.1"), anyString()
        );
    }

    // ── reviewClaim: REJECTED ─────────────────────────────────────────────────

    @Test
    @DisplayName("reviewClaim: REJECT — no GL entry posted")
    void testReviewClaim_reject_noJournalEntry() {
        ExpenseClaim pendingClaim = ExpenseClaim.builder()
                .id(claimId)
                .memberId(memberId)
                .amount(new BigDecimal("300.00"))
                .description("Suspicious expense")
                .status(ExpenseClaimStatus.PENDING)
                .build();

        when(expenseClaimRepository.findById(claimId)).thenReturn(Optional.of(pendingClaim));
        when(userRepository.findByEmail(staffEmail)).thenReturn(Optional.of(reviewerUser));
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(expenseClaimRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(false, "Receipt not valid");

        // Act
        ExpenseClaimResponse response = expenseClaimService.reviewClaim(claimId, request, staffEmail, "127.0.0.1");

        // Assert
        assertThat(response.status()).isEqualTo("REJECTED");
        assertThat(response.rejectionReason()).isEqualTo("Receipt not valid");

        // CRITICAL: no GL entry on rejection
        verify(journalEntryService, never()).postExpenseReimbursementClaim(any(), any(), any());

        verify(securityAuditService).logEventWithActorAndIp(
                eq(staffEmail), eq("EXPENSE_CLAIM_REJECTED"), anyString(), eq("127.0.0.1"), anyString()
        );
    }

    @Test
    @DisplayName("reviewClaim: REJECT without reason — throws IllegalArgumentException")
    void testReviewClaim_rejectWithoutReason_throws() {
        ExpenseClaim pendingClaim = ExpenseClaim.builder()
                .id(claimId).memberId(memberId)
                .amount(new BigDecimal("100.00")).description("Test")
                .status(ExpenseClaimStatus.PENDING).build();

        when(expenseClaimRepository.findById(claimId)).thenReturn(Optional.of(pendingClaim));
        when(userRepository.findByEmail(staffEmail)).thenReturn(Optional.of(reviewerUser));

        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(false, "");

        assertThatThrownBy(() -> expenseClaimService.reviewClaim(claimId, request, staffEmail, "127.0.0.1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection reason");

        verify(journalEntryService, never()).postExpenseReimbursementClaim(any(), any(), any());
    }

    // ── Idempotency guard ─────────────────────────────────────────────────────

    @Test
    @DisplayName("reviewClaim: already APPROVED — throws IllegalStateException (idempotency guard)")
    void testReviewClaim_alreadyApproved_throws() {
        ExpenseClaim alreadyApproved = ExpenseClaim.builder()
                .id(claimId).memberId(memberId)
                .amount(new BigDecimal("500.00")).description("Already approved")
                .status(ExpenseClaimStatus.APPROVED).build();

        when(expenseClaimRepository.findById(claimId)).thenReturn(Optional.of(alreadyApproved));
        when(userRepository.findByEmail(staffEmail)).thenReturn(Optional.of(reviewerUser));

        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(true, null);

        assertThatThrownBy(() -> expenseClaimService.reviewClaim(claimId, request, staffEmail, "127.0.0.1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APPROVED");

        verify(journalEntryService, never()).postExpenseReimbursementClaim(any(), any(), any());
        verify(expenseClaimRepository, never()).save(any());
    }
}
