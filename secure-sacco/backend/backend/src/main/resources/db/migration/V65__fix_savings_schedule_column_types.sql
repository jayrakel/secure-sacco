-- ============================================================
-- SAC-218 fix: V64 created savings_deadline_hour and
-- savings_deadline_minute as SMALLINT (int2), but the
-- SaccoSettings Java entity declares them as Integer which
-- Hibernate maps to INTEGER (int4). Widen both columns.
-- ============================================================

ALTER TABLE sacco_settings
    ALTER COLUMN savings_deadline_hour   TYPE INTEGER,
    ALTER COLUMN savings_deadline_minute TYPE INTEGER;