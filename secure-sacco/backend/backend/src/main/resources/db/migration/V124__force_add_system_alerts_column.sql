ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS notify_on_system_alerts BOOLEAN NOT NULL DEFAULT TRUE;
