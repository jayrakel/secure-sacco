-- V39__add_must_change_password_to_users.sql
--
-- Adds a flag that forces the admin (and any user whose password was reset
-- by an administrator) to choose a new password on their very next login.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- The bootstrap system admin must change their password on first login.
-- This is identified by their email matching the configured admin email.
-- At runtime, DataInitializer also sets this flag when creating the admin.
-- This migration sets it retroactively for any existing admin account.
UPDATE users
SET must_change_password = TRUE
WHERE id IN (
    SELECT u.id
    FROM users u
             JOIN user_roles ur ON u.id = ur.user_id
             JOIN roles r ON ur.role_id = r.id
    WHERE r.name = 'SYSTEM_ADMIN'
      AND u.must_change_password = FALSE
);

COMMENT ON COLUMN users.must_change_password IS
    'When TRUE, the user is redirected to /change-password after login and '
        'cannot access any other endpoint until the password is updated.';