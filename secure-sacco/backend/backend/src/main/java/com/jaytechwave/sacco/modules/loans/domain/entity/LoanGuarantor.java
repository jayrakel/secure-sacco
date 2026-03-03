package com.jaytechwave.sacco.modules.loans.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "loan_guarantors", indexes = {
        @Index(name = "idx_loan_guarantor_app_id", columnList = "loan_application_id"),
        @Index(name = "idx_loan_guarantor_member_id", columnList = "guarantor_member_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanGuarantor {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_application_id", nullable = false)
    private LoanApplication loanApplication;

    @Column(name = "guarantor_member_id", nullable = false)
    private UUID guarantorMemberId;

    @Column(name = "guaranteed_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal guaranteedAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GuarantorStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}