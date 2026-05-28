-- =============================================================================
-- V63: Add arrived_at to meeting_attendance.
--
-- Separates "when was this record saved" (recorded_at — administrative metadata)
-- from "when did the member physically arrive" (arrived_at — used for penalty
-- tier calculation).
--
-- arrived_at is nullable:
--   - Set to exact timestamp for self-check-in
--   - Set by admin when they know the arrival time
--   - NULL when admin marks LATE without specifying arrival time
--     (penalty engine applies minimum tier LATE_30 as a safe default)
-- =============================================================================

ALTER TABLE meeting_attendance
    ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP;

-- Backfill: for existing LATE records, set arrived_at = recorded_at
-- so historical records still have a value for penalty calculation.
UPDATE meeting_attendance
SET arrived_at = recorded_at
WHERE status = 'LATE'
  AND arrived_at IS NULL;