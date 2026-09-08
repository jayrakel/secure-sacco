CREATE TABLE system_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    maintenance_start_time TIMESTAMP NOT NULL,
    maintenance_end_time TIMESTAMP NOT NULL,
    notify_members_app BOOLEAN NOT NULL DEFAULT TRUE,
    notify_members_sms BOOLEAN NOT NULL DEFAULT FALSE,
    notify_members_email BOOLEAN NOT NULL DEFAULT FALSE,
    members_notified BOOLEAN NOT NULL DEFAULT FALSE,
    admin_reminded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE INDEX idx_system_maintenance_start_time ON system_maintenance(maintenance_start_time);
