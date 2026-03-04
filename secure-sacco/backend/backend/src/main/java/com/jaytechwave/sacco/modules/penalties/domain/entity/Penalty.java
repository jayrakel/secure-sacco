package com.jaytechwave.sacco.modules.penalties.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "penalties")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Penalty {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    // Made generic to support Lateness/Absenteeism later
    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "penalty_rule_id", nullable = false)
    private PenaltyRule penaltyRule;

    @Column(name = "original_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal originalAmount;

    @Column(name = "outstanding_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal outstandingAmount;

    @Builder.Default
    @Column(name = "principal_paid", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalPaid = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "interest_paid", nullable = false, precision = 15, scale = 2)
    private BigDecimal interestPaid = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PenaltyStatus status;

    @OneToMany(mappedBy = "penalty", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PenaltyAccrual> accruals = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


    // Helper to keep bi-directional relationship in sync
    public void addAccrual(PenaltyAccrual accrual) {
        accruals.add(accrual);
        accrual.setPenalty(this);
    }
}