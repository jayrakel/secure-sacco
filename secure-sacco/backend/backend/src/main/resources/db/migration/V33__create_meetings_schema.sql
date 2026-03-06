CREATE TABLE meetings (
                          id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                          title              VARCHAR(255) NOT NULL,
                          description        TEXT,
                          meeting_type       VARCHAR(50)  NOT NULL DEFAULT 'GENERAL',
                          start_at           TIMESTAMP    NOT NULL,
                          end_at             TIMESTAMP,
                          late_after_minutes INT          NOT NULL DEFAULT 15,
                          status             VARCHAR(50)  NOT NULL DEFAULT 'SCHEDULED',
                          created_by_user_id UUID,
                          created_at         TIMESTAMP    NOT NULL DEFAULT now(),
                          updated_at         TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_start_at ON meetings(start_at);
CREATE INDEX idx_meetings_status   ON meetings(status);