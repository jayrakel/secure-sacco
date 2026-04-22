-- ============================================================
-- SAC-218: Savings Schedule Settings
-- Stores the day + time by which members must save each period.
-- Example: THURSDAY, deadline FRIDAY at 23:59 (next_day=true).
-- ============================================================

ALTER TABLE sacco_settings
    ADD COLUMN IF NOT EXISTS savings_day              VARCHAR(10)  NOT NULL DEFAULT 'THURSDAY',
    ADD COLUMN IF NOT EXISTS savings_deadline_next_day BOOLEAN     NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS savings_deadline_hour     SMALLINT    NOT NULL DEFAULT 23,
    ADD COLUMN IF NOT EXISTS savings_deadline_minute   SMALLINT    NOT NULL DEFAULT 59;

COMMENT ON COLUMN sacco_settings.savings_day              IS 'DayOfWeek name (MONDAY…SUNDAY) — the group''s primary savings day.';
COMMENT ON COLUMN sacco_settings.savings_deadline_next_day IS 'If true the hard deadline is the day AFTER savings_day; if false it is savings_day itself.';
COMMENT ON COLUMN sacco_settings.savings_deadline_hour    IS 'Hour (0-23) of the deadline time in Africa/Nairobi.';
COMMENT ON COLUMN sacco_settings.savings_deadline_minute  IS 'Minute (0-59) of the deadline time in Africa/Nairobi.';