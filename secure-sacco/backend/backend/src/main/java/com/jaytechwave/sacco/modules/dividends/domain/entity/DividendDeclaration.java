package com.jaytechwave.sacco.modules.dividends.domain.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "dividend_declarations")
public class DividendDeclaration {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "financial_year", nullable = false)
    private Integer financialYear;

    @Column(name = "rate_percentage", nullable = false)
    private BigDecimal ratePercentage;

    @Column(name = "total_allocated", nullable = false)
    private BigDecimal totalAllocated = BigDecimal.ZERO;

    @Column(name = "calculation_mode", nullable = false)
    private String calculationMode = "SHARE_CAPITAL"; // SHARE_CAPITAL, SAVINGS, or BOTH

    @Column(nullable = false)
    private String status = "DRAFT";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
