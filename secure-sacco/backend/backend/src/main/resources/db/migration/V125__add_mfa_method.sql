-- Add mfa_method to users table, defaulting to TOTP
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_method VARCHAR(50) DEFAULT 'TOTP' NOT NULL;
