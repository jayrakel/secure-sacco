package com.jaytechwave.sacco.modules.settings.api.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

public class SaccoSettingsDTOs {

    // ── Initialize (one-time setup) ──────────────────────────────────────────

    @Data
    public static class InitializeRequest {

        @NotBlank(message = "SACCO Name is required")
        private String saccoName;

        private String logoUrl;
        private String faviconUrl;

        @NotBlank(message = "Prefix is required")
        @Size(min = 3, max = 3, message = "Prefix must be exactly 3 characters")
        private String prefix;

        @Min(value = 1, message = "Pad length must be at least 1")
        private int padLength = 7;

        @NotNull(message = "Registration fee is required")
        @DecimalMin(value = "0.0", message = "Registration fee cannot be negative")
        private BigDecimal registrationFee;
    }

    // ── Core identity update ─────────────────────────────────────────────────

    @Data
    public static class UpdateCoreRequest {

        @NotBlank(message = "SACCO Name is required")
        private String saccoName;

        private String logoUrl;
        private String faviconUrl;

        @NotBlank(message = "Prefix is required")
        @Size(min = 3, max = 3, message = "Prefix must be exactly 3 characters")
        private String prefix;

        @Min(value = 1, message = "Pad length must be at least 1")
        private int padLength;

        @NotNull(message = "Registration fee is required")
        @DecimalMin(value = "0.0", message = "Registration fee cannot be negative")
        private BigDecimal registrationFee;
    }

    // ── Security policy update ───────────────────────────────────────────────

    @Data
    public static class UpdateSecurityPolicyRequest {

        @NotNull @Min(value = 1, message = "Must allow at least 1 attempt")
        @Max(value = 20, message = "Max login attempts cannot exceed 20")
        private Integer maxLoginAttempts;

        @NotNull @Min(value = 1, message = "Lockout must be at least 1 minute")
        @Max(value = 1440, message = "Lockout cannot exceed 24 hours (1440 minutes)")
        private Integer lockoutDurationMinutes;

        @NotNull @Min(value = 5, message = "Session timeout must be at least 5 minutes")
        @Max(value = 480, message = "Session timeout cannot exceed 8 hours (480 minutes)")
        private Integer sessionTimeoutMinutes;

        @NotNull @Min(value = 5, message = "Password reset expiry must be at least 5 minutes")
        @Max(value = 1440, message = "Password reset expiry cannot exceed 24 hours")
        private Integer passwordResetExpiryMin;

        @NotNull @Min(value = 1, message = "MFA token expiry must be at least 1 minute")
        @Max(value = 60, message = "MFA token expiry cannot exceed 60 minutes")
        private Integer mfaTokenExpiryMinutes;

        @NotNull @Min(value = 1, message = "Email verification expiry must be at least 1 hour")
        @Max(value = 168, message = "Email verification expiry cannot exceed 7 days (168 hours)")
        private Integer emailVerifyExpiryHours;

        @NotNull @Min(value = 8, message = "Minimum password length must be at least 8")
        @Max(value = 64, message = "Minimum password length cannot exceed 64")
        private Integer minPasswordLength;

        @NotNull @Min(value = 1)
        @Max(value = 20, message = "Contact verification rate limit cannot exceed 20")
        private Integer contactVerifyRateLimit;

        @NotNull @Min(value = 1)
        @Max(value = 60, message = "Contact verification window cannot exceed 60 minutes")
        private Integer contactVerifyWindowMin;

        @NotNull @Min(value = 10, message = "General rate limit must be at least 10 requests/min")
        @Max(value = 300, message = "General rate limit cannot exceed 300 requests/min")
        private Integer rateLimitGeneralPerMin;
    }

    // ── Communication update ─────────────────────────────────────────────────

    @Data
    public static class UpdateCommunicationRequest {
        @NotBlank(message = "Sender display name is required")
        @Size(max = 255, message = "Sender name cannot exceed 255 characters")
        private String smtpFromName;

        @Size(max = 255, message = "Support email cannot exceed 255 characters")
        @Email(message = "Support email must be a valid email address", regexp = ".*|")
        private String supportEmail;
    }

    // ── Feature flags update ─────────────────────────────────────────────────

    @Data
    public static class UpdateFlagsRequest {
        @NotNull(message = "Flags map cannot be null")
        private Map<String, Boolean> flags;
    }

    // ── Savings schedule update ──────────────────────────────────────────────

    @Data
    public static class UpdateSavingsScheduleRequest {

        /** DayOfWeek name: MONDAY, TUESDAY, …, SUNDAY */
        @NotBlank(message = "Savings day is required")
        @Pattern(
                regexp = "MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY",
                message = "Must be a valid day of the week (e.g., THURSDAY)"
        )
        private String savingsDay;

        /**
         * If true, the hard deadline is the day AFTER savingsDay.
         * If false, the deadline is savingsDay itself at the specified time.
         */
        @NotNull(message = "savingsDeadlineNextDay is required")
        private Boolean savingsDeadlineNextDay;

        @NotNull
        @Min(value = 0, message = "Hour must be 0-23")
        @Max(value = 23, message = "Hour must be 0-23")
        private Integer savingsDeadlineHour;

        @NotNull
        @Min(value = 0, message = "Minute must be 0-59")
        @Max(value = 59, message = "Minute must be 0-59")
        private Integer savingsDeadlineMinute;
    }
}