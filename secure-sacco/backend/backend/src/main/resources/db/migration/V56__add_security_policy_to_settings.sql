-- V56: Add configurable security policy fields to sacco_settings
-- Replaces hardcoded constants in LoginAttemptService, MfaService,
-- PasswordResetService, ContactVerificationService, and PasswordValidator.

ALTER TABLE sacco_settings
    ADD COLUMN IF NOT EXISTS max_login_attempts         INT          NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS lockout_duration_minutes   INT          NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS session_timeout_minutes    INT          NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS password_reset_expiry_min  INT          NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS mfa_token_expiry_minutes   INT          NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS email_verify_expiry_hours  INT          NOT NULL DEFAULT 24,
    ADD COLUMN IF NOT EXISTS min_password_length        INT          NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS contact_verify_rate_limit  INT          NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS contact_verify_window_min  INT          NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS rate_limit_general_per_min INT          NOT NULL DEFAULT 60,
    ADD COLUMN IF NOT EXISTS smtp_from_name             VARCHAR(255) NOT NULL DEFAULT 'Secure SACCO',
    ADD COLUMN IF NOT EXISTS support_email              VARCHAR(255) NOT NULL DEFAULT '';

COMMENT ON COLUMN sacco_settings.max_login_attempts
    IS 'Maximum consecutive failed logins before the account is locked';
COMMENT ON COLUMN sacco_settings.lockout_duration_minutes
    IS 'How long (minutes) an account remains locked after too many failures';
COMMENT ON COLUMN sacco_settings.session_timeout_minutes
    IS 'Idle session timeout in minutes (informational — takes effect after restart)';
COMMENT ON COLUMN sacco_settings.password_reset_expiry_min
    IS 'Password-reset link validity window in minutes';
COMMENT ON COLUMN sacco_settings.mfa_token_expiry_minutes
    IS 'MFA pre-authentication token TTL in minutes';
COMMENT ON COLUMN sacco_settings.email_verify_expiry_hours
    IS 'Email-verification link validity in hours';
COMMENT ON COLUMN sacco_settings.min_password_length
    IS 'Minimum password length enforced at registration and password reset';
COMMENT ON COLUMN sacco_settings.contact_verify_rate_limit
    IS 'Max verification requests per window before rate-limiting kicks in';
COMMENT ON COLUMN sacco_settings.contact_verify_window_min
    IS 'Sliding window (minutes) for contact-verification rate limiting';
COMMENT ON COLUMN sacco_settings.rate_limit_general_per_min
    IS 'General API rate limit: max requests per user per minute';
COMMENT ON COLUMN sacco_settings.smtp_from_name
    IS 'Display name used in the From field of outgoing emails';
COMMENT ON COLUMN sacco_settings.support_email
    IS 'Support email address shown to members in the UI and emails';