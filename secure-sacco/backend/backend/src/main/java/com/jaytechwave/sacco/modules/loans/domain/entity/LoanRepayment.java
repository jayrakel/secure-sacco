package com.jaytechwave.sacco.modules.loans.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "loan_repayments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanRepayment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_application_id", nullable = false)
    private LoanApplication loanApplication;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Builder.Default
    @Column(name = "principal_allocated", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalAllocated = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "interest_allocated", nullable = false, precision = 15, scale = 2)
    private BigDecimal interestAllocated = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "prepayment_allocated", nullable = false, precision = 15, scale = 2)
    private BigDecimal prepaymentAllocated = BigDecimal.ZERO;

    @Column(name = "receipt_number", length = 100)
    private String receiptNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private LoanRepaymentStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}