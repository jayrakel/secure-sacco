package com.jaytechwave.sacco.modules.loans.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "loan_applications", indexes = {
        @Index(name = "idx_loan_app_member_id", columnList = "member_id"),
        @Index(name = "idx_loan_app_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_product_id", nullable = false)
    private LoanProduct loanProduct;

    @Column(name = "principal_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "application_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal applicationFee;

    @Column(name = "application_fee_paid")
    private Boolean applicationFeePaid;

    @Column(name = "application_fee_reference")
    private String applicationFeeReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanStatus status;

    @Column(columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "term_weeks", nullable = false)
    private Integer termWeeks = 104;

    // --- Tier 1: Verification (Loans Officer) ---
    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "verification_notes", columnDefinition = "TEXT")
    private String verificationNotes;

    // --- Tier 2: Approval (Committee) ---
    @Column(name = "committee_approved_by")
    private UUID committeeApprovedBy;

    @Column(name = "committee_approved_at")
    private LocalDateTime committeeApprovedAt;

    @Column(name = "committee_notes", columnDefinition = "TEXT")
    private String committeeNotes;

    // --- Tier 3: Disbursement (Treasurer) ---
    @Column(name = "disbursed_by")
    private UUID disbursedBy;

    @Column(name = "disbursed_at")
    private LocalDateTime disbursedAt;

    @Builder.Default
    @Column(name = "prepayment_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal prepaymentBalance = BigDecimal.ZERO;

    @Column(name = "reference_notes", columnDefinition = "TEXT")
    private String referenceNotes;

    // --- Audit Fields ---
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}