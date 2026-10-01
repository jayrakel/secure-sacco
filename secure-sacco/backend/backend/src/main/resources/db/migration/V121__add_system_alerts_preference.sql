ALTER TABLE notification_preferences
ADD COLUMN notify_on_system_alerts BOOLEAN NOT NULL DEFAULT TRUE;
