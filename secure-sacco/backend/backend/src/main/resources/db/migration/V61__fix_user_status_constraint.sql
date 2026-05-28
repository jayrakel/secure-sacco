-- =============================================================================
-- V61: Fix user status check constraint.
--
-- V7 changed the constraint to ('ACTIVE','INACTIVE','LOCKED','PENDING_ACTIVATION')
-- but the Java UserStatus enum uses DISABLED (not INACTIVE).
-- Any call to suspend a user throws DataIntegrityViolationException.
--
-- This migration drops the constraint and recreates it with all values
-- that the Java enum can produce, keeping INACTIVE for backward compat
-- in case any rows already have that value.
-- =============================================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_status;

ALTER TABLE users ADD CONSTRAINT chk_users_status
    CHECK (user_status IN ('ACTIVE', 'DISABLED', 'INACTIVE', 'LOCKED', 'PENDING_ACTIVATION'));