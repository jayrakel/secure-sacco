package com.jaytechwave.sacco.modules.penalties.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "penalty_repayments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PenaltyRepayment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "target_penalty_id")
    private UUID targetPenaltyId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Builder.Default
    @Column(name = "principal_allocated", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalAllocated = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "interest_allocated", nullable = false, precision = 15, scale = 2)
    private BigDecimal interestAllocated = BigDecimal.ZERO;

    @Column(name = "receipt_number", length = 100)
    private String receiptNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PenaltyRepaymentStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}