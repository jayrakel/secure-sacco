package com.jaytechwave.sacco.modules.savings.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "savings_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavingsTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "savings_account_id", nullable = false)
    private UUID savingsAccountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TransactionChannel channel;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(length = 100)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.PENDING;

    @Column(name = "posted_at")
    private LocalDateTime postedAt;

    /**
     * When the payment was actually made — sourced from the bank's ValueDate
     * on the IPN or mini-statement. Used for compliance evaluation instead of
     * postedAt so members are not penalised for late system processing.
     * Null for older records — compliance falls back to postedAt via
     * COALESCE(valueDate, postedAt) in the repository query.
     */
    @Column(name = "value_date")
    private LocalDateTime valueDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}