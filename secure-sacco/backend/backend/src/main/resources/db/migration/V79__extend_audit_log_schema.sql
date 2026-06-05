-- =============================================================================
-- V79: Extend security_audit_logs for PBAC unified audit standard
--
-- Phase A of the PBAC & Audit Migration.
-- Adds 9 columns required by AUDIT_EVENT_STANDARD.md.
-- All new columns are nullable for full backward compatibility with
-- existing rows (9+ columns of existing data are unaffected).
--
-- The make_audit_logs_append_only immutability trigger (V37) is NOT
-- affected — ALTER TABLE does not trigger UPDATE or DELETE.
-- =============================================================================

ALTER TABLE security_audit_logs
    ADD COLUMN IF NOT EXISTS user_id         UUID,
    ADD COLUMN IF NOT EXISTS member_id       UUID,
    ADD COLUMN IF NOT EXISTS session_id      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS permission_used VARCHAR(80),
    ADD COLUMN IF NOT EXISTS result          VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    ADD COLUMN IF NOT EXISTS entity_type     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS entity_id       UUID,
    ADD COLUMN IF NOT EXISTS user_agent      TEXT,
    ADD COLUMN IF NOT EXISTS before_state    JSONB,
    ADD COLUMN IF NOT EXISTS after_state     JSONB;

-- Result constraint (pre-existing rows default to 'SUCCESS' via DEFAULT above)
ALTER TABLE security_audit_logs
    DROP CONSTRAINT IF EXISTS chk_audit_result;

ALTER TABLE security_audit_logs
    ADD CONSTRAINT chk_audit_result CHECK (result IN ('SUCCESS', 'FAILURE', 'DENIED'));

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_user_id    ON security_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON security_audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_result     ON security_audit_logs (result);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON security_audit_logs (created_at DESC);

COMMENT ON COLUMN security_audit_logs.user_id         IS 'FK to users.id — null for SYSTEM and ANONYMOUS actors';
COMMENT ON COLUMN security_audit_logs.member_id       IS 'FK to members.id — null if actor is staff or system';
COMMENT ON COLUMN security_audit_logs.session_id      IS 'Spring Session ID — null for system-initiated events';
COMMENT ON COLUMN security_audit_logs.permission_used IS 'Permission that authorized this action — null for system events';
COMMENT ON COLUMN security_audit_logs.result          IS 'SUCCESS | FAILURE | DENIED';
COMMENT ON COLUMN security_audit_logs.entity_type     IS 'Java entity class name e.g. LoanApplication, Member';
COMMENT ON COLUMN security_audit_logs.entity_id       IS 'PK of the affected entity row';
COMMENT ON COLUMN security_audit_logs.user_agent      IS 'HTTP User-Agent header — null for system events';
COMMENT ON COLUMN security_audit_logs.before_state    IS 'Flat JSON snapshot of entity state before change';
COMMENT ON COLUMN security_audit_logs.after_state     IS 'Flat JSON snapshot of entity state after change';
