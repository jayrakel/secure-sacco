package com.jaytechwave.sacco.modules.loans.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "loan_disbursement_approvals", indexes = {
        @Index(name = "idx_loan_disbursement_app_id", columnList = "loan_application_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanDisbursementApproval {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_application_id", nullable = false)
    private LoanApplication loanApplication;

    @Column(name = "approver_member_id", nullable = false)
    private UUID approverMemberId;

    @Column(name = "approver_role", nullable = false, length = 50)
    private String approverRole; // e.g. "CHAIRMAN", "TREASURER", "NOMINATED_MEMBER"

    @CreationTimestamp
    @Column(name = "approved_at", updatable = false)
    private LocalDateTime approvedAt;
}
