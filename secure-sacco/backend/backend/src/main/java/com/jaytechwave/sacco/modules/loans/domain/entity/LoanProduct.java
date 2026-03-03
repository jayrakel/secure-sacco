package com.jaytechwave.sacco.modules.loans.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "loan_products")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanProduct {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RepaymentFrequency repaymentFrequency;

    @Column(nullable = false)
    private Integer termWeeks;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterestModel interestModel;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal interestRate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal applicationFee;

    @Column(nullable = false)
    private Integer gracePeriodDays;

    @Column(nullable = false)
    private Boolean isActive;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}