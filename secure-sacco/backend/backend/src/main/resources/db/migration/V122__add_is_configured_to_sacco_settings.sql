-- V122__add_is_configured_to_sacco_settings.sql
-- Tracks whether SACCO settings have been explicitly configured by admin during setup
-- vs. just auto-seeded with defaults during database migration.

ALTER TABLE sacco_settings
ADD COLUMN is_configured BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark existing seeded settings as not yet configured
-- (admin can reconfigure them through the setup wizard if needed)
UPDATE sacco_settings SET is_configured = FALSE WHERE is_configured = FALSE;

CREATE INDEX idx_sacco_settings_is_configured ON sacco_settings(is_configured);

