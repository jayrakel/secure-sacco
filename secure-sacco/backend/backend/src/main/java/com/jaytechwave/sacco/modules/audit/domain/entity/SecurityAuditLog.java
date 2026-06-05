package com.jaytechwave.sacco.modules.audit.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable audit record for the security_audit_logs table.
 *
 * <p>The table is protected by a database-level trigger (V37) that blocks
 * UPDATE and DELETE. This entity must NEVER expose setters that could be
 * used to mutate an already-persisted record — all fields are set once
 * during construction via the builder.</p>
 *
 * <p>Schema extended in V79 to satisfy the AUDIT_EVENT_STANDARD.md
 * unified audit standard. All new fields are nullable so that existing
 * call sites using the legacy API continue to work unchanged.</p>
 */
@Entity
@Table(name = "security_audit_logs")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityAuditLog {

    // ── Identity ──────────────────────────────────────────────────────────────

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    // ── Actor ─────────────────────────────────────────────────────────────────

    /** User email, "SYSTEM:{ClassName}", or "ANONYMOUS". Never null. */
    @Column(nullable = false)
    private String actor;

    /** FK to users.id — null for SYSTEM and ANONYMOUS actors. */
    @Column(name = "user_id")
    private UUID userId;

    /** FK to members.id — null if actor is staff or system. */
    @Column(name = "member_id")
    private UUID memberId;

    /** Spring Session ID — null for system-initiated events. */
    @Column(name = "session_id", length = 100)
    private String sessionId;

    // ── Action ────────────────────────────────────────────────────────────────

    /** Event code — must match AUDIT_EVENT_STANDARD.md event registry. */
    @Column(nullable = false, length = 100)
    private String action;

    /** Permission that authorized this action — null for system events. */
    @Column(name = "permission_used", length = 80)
    private String permissionUsed;

    /** SUCCESS | FAILURE | DENIED. Defaults to SUCCESS. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AuditResult result = AuditResult.SUCCESS;

    // ── Target entity ─────────────────────────────────────────────────────────

    /** Java entity class name e.g. "LoanApplication", "Member". */
    @Column(name = "entity_type", length = 100)
    private String entityType;

    /** PK of the affected entity row. */
    @Column(name = "entity_id")
    private UUID entityId;

    /** Human-readable descriptor — module name or entity description. */
    @Column(length = 255)
    private String target;

    // ── Request context ───────────────────────────────────────────────────────

    /** IPv4 or IPv6 address — null for system events. */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /** HTTP User-Agent header — null for system events. */
    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    // ── Detail ───────────────────────────────────────────────────────────────

    /** Free-text description or structured summary for bulk events. */
    @Column(columnDefinition = "TEXT")
    private String details;

    // ── Change data ───────────────────────────────────────────────────────────

    /**
     * Flat JSON snapshot of entity state before change.
     * Null for read-only access events and system job summaries.
     * Must NOT contain PII such as passwordHash or raw MSISDN.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_state", columnDefinition = "jsonb")
    private String beforeState;

    /**
     * Flat JSON snapshot of entity state after change.
     * Null for read-only access events and system job summaries.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_state", columnDefinition = "jsonb")
    private String afterState;
}