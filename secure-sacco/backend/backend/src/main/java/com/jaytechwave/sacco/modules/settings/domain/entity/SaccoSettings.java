package com.jaytechwave.sacco.modules.settings.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "sacco_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaccoSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ── Identity ────────────────────────────────────────────────────────────

    @Column(name = "sacco_name", nullable = false)
    private String saccoName;

    @Column(name = "member_number_prefix", nullable = false, length = 3)
    private String memberNumberPrefix;

    @Column(name = "member_number_pad_length", nullable = false)
    @Builder.Default
    private Integer memberNumberPadLength = 7;

    @Column(name = "logo_url", columnDefinition = "TEXT DEFAULT ''")
    @Builder.Default
    private String logoUrl = "";

    @Column(name = "favicon_url", columnDefinition = "TEXT DEFAULT ''")
    @Builder.Default
    private String faviconUrl = "";

    // ── Financial ────────────────────────────────────────────────────────────

    @Column(name = "registration_fee", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal registrationFee = new BigDecimal("1000.00");

    // ── Communication ────────────────────────────────────────────────────────

    /** Display name in From: header of outgoing emails */
    @Column(name = "smtp_from_name", nullable = false)
    @Builder.Default
    private String smtpFromName = "Secure SACCO";

    /** Support contact shown to members */
    @Column(name = "support_email", nullable = false)
    @Builder.Default
    private String supportEmail = "";

    // ── Security policy ──────────────────────────────────────────────────────

    /** Maximum consecutive failed logins before lockout */
    @Column(name = "max_login_attempts", nullable = false)
    @Builder.Default
    private Integer maxLoginAttempts = 5;

    /** How long (minutes) an account is locked after too many failures */
    @Column(name = "lockout_duration_minutes", nullable = false)
    @Builder.Default
    private Integer lockoutDurationMinutes = 15;

    /**
     * Idle session timeout in minutes.
     * Informational — changing this requires a server restart to apply because
     * Spring Session reads it at startup via application.yml.
     */
    @Column(name = "session_timeout_minutes", nullable = false)
    @Builder.Default
    private Integer sessionTimeoutMinutes = 30;

    /** Password-reset link validity in minutes */
    @Column(name = "password_reset_expiry_min", nullable = false)
    @Builder.Default
    private Integer passwordResetExpiryMin = 15;

    /** MFA pre-auth token TTL in minutes */
    @Column(name = "mfa_token_expiry_minutes", nullable = false)
    @Builder.Default
    private Integer mfaTokenExpiryMinutes = 5;

    /** Email verification link validity in hours */
    @Column(name = "email_verify_expiry_hours", nullable = false)
    @Builder.Default
    private Integer emailVerifyExpiryHours = 24;

    /** Minimum password length enforced at registration and reset */
    @Column(name = "min_password_length", nullable = false)
    @Builder.Default
    private Integer minPasswordLength = 12;

    /** Max verification requests before rate-limiting triggers */
    @Column(name = "contact_verify_rate_limit", nullable = false)
    @Builder.Default
    private Integer contactVerifyRateLimit = 3;

    /** Sliding window (minutes) for contact-verification rate limiting */
    @Column(name = "contact_verify_window_min", nullable = false)
    @Builder.Default
    private Integer contactVerifyWindowMin = 15;

    // ── Rate limiting ────────────────────────────────────────────────────────

    /** General API rate limit: requests per user per minute */
    @Column(name = "rate_limit_general_per_min", nullable = false)
    @Builder.Default
    private Integer rateLimitGeneralPerMin = 60;

    // ── Feature flags ────────────────────────────────────────────────────────

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "enabled_modules", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private Map<String, Boolean> enabledModules = new HashMap<>();

    // ── Savings schedule ─────────────────────────────────────────────────────

    /**
     * The day of the week on which the group is expected to make savings / repayments.
     * Stored as the DayOfWeek name (e.g., "THURSDAY").
     */
    @Column(name = "savings_day", nullable = false, length = 10)
    @Builder.Default
    private String savingsDay = "THURSDAY";

    /**
     * If true, the hard deadline is the day AFTER {@link #savingsDay}.
     * If false, the deadline is savings_day itself at {@link #savingsDeadlineHour}:{@link #savingsDeadlineMinute}.
     */
    @Column(name = "savings_deadline_next_day", nullable = false)
    @Builder.Default
    private Boolean savingsDeadlineNextDay = true;

    /** Hour (0-23 in Africa/Nairobi) of the savings deadline. Default: 23. */
    @Column(name = "savings_deadline_hour", nullable = false)
    @Builder.Default
    private Integer savingsDeadlineHour = 23;

    /** Minute (0-59) of the savings deadline. Default: 59. */
    @Column(name = "savings_deadline_minute", nullable = false)
    @Builder.Default
    private Integer savingsDeadlineMinute = 59;

    // ── Audit ────────────────────────────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}