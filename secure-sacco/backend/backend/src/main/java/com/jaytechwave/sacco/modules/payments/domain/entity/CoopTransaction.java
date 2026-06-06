package com.jaytechwave.sacco.modules.payments.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Unified store for all Co-op Bank events.
 *
 * Every IPN, STK callback and mini-statement transaction is normalised and
 * written here before being displayed on the frontend. The frontend never
 * reads raw Co-op data — it always reads from this table.
 *
 * De-duplication is enforced by the UNIQUE constraint on {@code mpesaRef}.
 */
@Entity
@Table(name = "coop_transactions")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CoopTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** M-Pesa transaction reference (UF5BY709I7) — unique across all sources */
    @Column(name = "mpesa_ref", unique = true, length = 64)
    private String mpesaRef;

    /** Co-op Bank's own internal transaction ID (CB1287153_05062026_2) — for audit */
    @Column(name = "coop_transaction_id", length = 64)
    private String coopTransactionId;

    /** Where this record came from */
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private CoopTransactionSource source;

    // ── Financial ─────────────────────────────────────────────────────────────

    @Column(name = "transaction_type", nullable = false, length = 2)
    private String transactionType;  // CR | DR

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", length = 3)
    @Builder.Default
    private String currency = "KES";

    @Column(name = "running_balance", precision = 15, scale = 2)
    private BigDecimal runningBalance;

    @Column(name = "account_number", length = 30)
    private String accountNumber;

    // ── Dates ─────────────────────────────────────────────────────────────────

    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    @Column(name = "value_date")
    private LocalDateTime valueDate;

    // ── Sender ────────────────────────────────────────────────────────────────

    /** Normalised to 254XXXXXXXXX */
    @Column(name = "sender_phone", length = 20)
    private String senderPhone;

    /** Member full name resolved at write time. Null if not a member. */
    @Column(name = "sender_name", length = 255)
    private String senderName;

    @Column(name = "member_id")
    private UUID memberId;

    // ── Narration ─────────────────────────────────────────────────────────────

    @Column(name = "display_narration", columnDefinition = "TEXT")
    private String displayNarration;

    @Column(name = "raw_narration", columnDefinition = "TEXT")
    private String rawNarration;

    @Column(name = "account_reference", length = 255)
    private String accountReference;

    // ── Reconciliation ────────────────────────────────────────────────────────

    @Column(name = "savings_credited", nullable = false)
    @Builder.Default
    private boolean savingsCredited = false;

    @Column(name = "savings_credited_at")
    private LocalDateTime savingsCreditedAt;

    // ── Audit ─────────────────────────────────────────────────────────────────

    @Column(name = "raw_payload", columnDefinition = "TEXT")
    private String rawPayload;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}