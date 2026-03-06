CREATE TABLE meeting_attendance (
                                    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                    meeting_id          UUID        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                                    member_id           UUID        NOT NULL,
                                    status              VARCHAR(50) NOT NULL DEFAULT 'ABSENT',
                                    recorded_by_user_id UUID,
                                    recorded_at         TIMESTAMP   NOT NULL DEFAULT now(),
                                    CONSTRAINT uq_meeting_attendance UNIQUE (meeting_id, member_id)
);

CREATE INDEX idx_meeting_attendance_meeting ON meeting_attendance(meeting_id);
CREATE INDEX idx_meeting_attendance_member  ON meeting_attendance(member_id);