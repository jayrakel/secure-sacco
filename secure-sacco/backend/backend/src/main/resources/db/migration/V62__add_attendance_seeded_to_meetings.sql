-- =============================================================================
-- V62: Add attendance_seeded flag to meetings table.
--
-- When MeetingAttendanceSeedJob runs after a meeting starts, it sets this
-- flag to TRUE after creating ABSENT records for all active members.
-- This prevents the job from re-seeding the same meeting on every poll.
-- =============================================================================

ALTER TABLE meetings
    ADD COLUMN IF NOT EXISTS attendance_seeded BOOLEAN NOT NULL DEFAULT FALSE;