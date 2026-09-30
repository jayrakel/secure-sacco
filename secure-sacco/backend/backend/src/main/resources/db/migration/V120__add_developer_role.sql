-- V120__add_developer_role.sql
-- Adds the DEVELOPER role for technical/system alerts routing

INSERT INTO roles (name, description)
VALUES ('DEVELOPER', 'Technical staff receiving critical system alerts and developer notifications')
ON CONFLICT (name) DO NOTHING;
