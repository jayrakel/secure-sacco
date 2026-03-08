-- V40__encrypt_pii_fields.sql
--
-- Prepares the schema for field-level AES-256-GCM encryption of PII fields.
-- The application-level EncryptedStringConverter will transparently encrypt
-- values on write and decrypt on read once this migration has run.
--
-- IMPORTANT: Run the data migration script (scripts/migrate-pii-to-encrypted.sh)
-- AFTER deploying this migration and BEFORE running any application instance
-- that uses the new encrypted columns. Do NOT run both at the same time.
--
-- Column sizing: AES-256-GCM ciphertext = plaintext + 16 bytes (tag).
-- Base64 overhead ≈ 4/3. IV (12 bytes) adds ~16 chars. Separator adds 1 char.
-- Safe upper bound for a 50-char plaintext: ~120 chars. Use 512 to be safe.
--
-- Hash columns: HMAC-SHA256 output = 32 bytes → 44 chars Base64.

-- ─── members ──────────────────────────────────────────────────────────────────

-- Widen national_id to hold ciphertext
ALTER TABLE members
    ALTER COLUMN national_id TYPE VARCHAR(512);

-- Add search hash for national_id (enables findByNationalIdHash queries)
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS national_id_hash VARCHAR(88);

-- Widen phone_number
ALTER TABLE members
    ALTER COLUMN phone_number TYPE VARCHAR(512);

-- Add search hash for phone_number
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS phone_number_hash VARCHAR(88);

-- ─── users ────────────────────────────────────────────────────────────────────

-- Widen phone_number
ALTER TABLE users
    ALTER COLUMN phone_number TYPE VARCHAR(512);

-- Add search hash for phone_number
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone_number_hash VARCHAR(88);

-- ─── Indexes for hash-based lookups (replace any existing plaintext indexes) ──

-- Drop any existing plaintext unique constraint on national_id (searches will
-- use hash column instead)
ALTER TABLE members DROP CONSTRAINT IF EXISTS uq_members_national_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_national_id_hash
    ON members (national_id_hash)
    WHERE national_id_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_phone_hash
    ON members (phone_number_hash)
    WHERE phone_number_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_phone_hash
    ON users (phone_number_hash)
    WHERE phone_number_hash IS NOT NULL;

COMMENT ON COLUMN members.national_id      IS 'AES-256-GCM encrypted. Use national_id_hash for exact-match queries.';
COMMENT ON COLUMN members.national_id_hash IS 'HMAC-SHA256 of national_id for searchability without decryption.';
COMMENT ON COLUMN members.phone_number     IS 'AES-256-GCM encrypted. Use phone_number_hash for exact-match queries.';
COMMENT ON COLUMN members.phone_number_hash IS 'HMAC-SHA256 of phone_number for searchability without decryption.';