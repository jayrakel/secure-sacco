package com.jaytechwave.sacco.modules.expense.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Represents a member expense reimbursement claim.
 *
 * <p>A member pays a SACCO expense out of pocket and submits a claim.
 * Staff (Treasurer/Admin) must approve or reject the claim.
 * Only APPROVED claims result in a GL journal entry — no automatic posting.
 *
 * <p>GL entry on approval:
 * <pre>
 *   DR 5360 Member Expense Reimbursement (EXPENSE)
 *   CR 2190 Member Reimbursement Payable  (LIABILITY)
 * </pre>
 */
@Entity
@Table(name = "expense_claims")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The member who paid the SACCO expense out of pocket. */
    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    /** Amount claimed for reimbursement (must be > 0). */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    /** Human-readable description of the expense (e.g., "Bought A4 paper for AGM"). */
    @Column(nullable = false, columnDefinition = "text")
    private String description;

    /** Receipt number or external reference provided by the member (optional). */
    @Column(name = "receipt_reference", length = 255)
    private String receiptReference;

    /** Current lifecycle state of this claim. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ExpenseClaimStatus status = ExpenseClaimStatus.PENDING;

    /**
     * Populated when a claim is REJECTED — mandatory reason for audit trail.
     * Null for PENDING and APPROVED claims.
     */
    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    /** The user (Treasurer/Admin) who reviewed this claim. */
    @Column(name = "reviewed_by_user_id")
    private UUID reviewedByUserId;

    /** Timestamp of the approval or rejection decision. */
    @Column(name = "reviewed_at")
    private ZonedDateTime reviewedAt;

    /**
     * GL journal entry reference — populated on approval (format: EXP-{id}).
     * Null until the claim is approved and the entry is posted.
     */
    @Column(name = "journal_reference", length = 100)
    private String journalReference;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
