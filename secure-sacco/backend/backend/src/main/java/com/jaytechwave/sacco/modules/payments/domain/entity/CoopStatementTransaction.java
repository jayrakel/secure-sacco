package com.jaytechwave.sacco.modules.payments.domain.entity;

import com.jaytechwave.sacco.modules.core.util.SaccoDateUtils;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stores every transaction fetched from Co-op Bank mini-statement.
 * Polled every 15 minutes and deduplicated by transactionId.
 * Accumulates full history over time — solves the 10-transaction cap.
 */
@Entity
@Table(name = "coop_statement_transactions")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CoopStatementTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Co-op's own transaction ID e.g. "CB0592306" — unique, prevents double-inserts */
    @Column(name = "transaction_id", unique = true, nullable = false, length = 64)
    private String transactionId;

    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    @Column(name = "value_date")
    private LocalDateTime valueDate;

    @Column(columnDefinition = "TEXT")
    private String narration;        // parsed display (e.g. "BETTER LINK VENTURES SACCO")

    @Column(name = "raw_narration", columnDefinition = "TEXT")
    private String rawNarration;     // original tilde-separated string from Co-op

    /** "CR" or "DR" */
    @Column(name = "transaction_type", nullable = false, length = 2)
    private String transactionType;

    @Column(name = "credit_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal creditAmount = BigDecimal.ZERO;

    @Column(name = "debit_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal debitAmount = BigDecimal.ZERO;

    /** creditAmount or debitAmount — whichever is non-zero */
    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "running_cleared_balance", precision = 15, scale = 2)
    private BigDecimal runningClearedBalance;

    @Column(name = "transaction_reference", length = 64)
    private String transactionReference;

    @Column(name = "sender_phone", length = 20)
    private String senderPhone;

    @Column(name = "account_number", length = 30)
    private String accountNumber;

    // ── Reconciliation ────────────────────────────────────────────────────────

    @Column(nullable = false)
    @Builder.Default
    private boolean reconciled = false;

    @Column(name = "member_id")
    private UUID memberId;

    @Column(name = "reconciled_at")
    private LocalDateTime reconciledAt;

    @Column(name = "reconciled_by")
    private UUID reconciledBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ── Audit ─────────────────────────────────────────────────────────────────

    @Column(name = "fetched_at", nullable = false)
    @Builder.Default
    private LocalDateTime fetchedAt = LocalDateTime.now(SaccoDateUtils.NAIROBI);

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}