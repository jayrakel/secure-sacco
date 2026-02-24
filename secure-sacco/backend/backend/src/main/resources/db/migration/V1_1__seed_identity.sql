-- V1_1__seed_identity.sql
-- Idempotent seed for roles, baseline permissions, starter mappings, and bootstrap admin.

-- 1) Seed Roles
INSERT INTO roles (name, description)
VALUES
    ('SYSTEM_ADMIN', 'Break-glass superuser for system setup and recovery'),
    ('CHAIRPERSON', 'SACCO chairperson'),
    ('DEPUTY_CHAIRPERSON', 'Deputy chairperson'),
    ('SECRETARY', 'SACCO secretary'),
    ('DEPUTY_SECRETARY', 'Deputy secretary'),
    ('TREASURER', 'SACCO treasurer'),
    ('DEPUTY_TREASURER', 'Deputy treasurer'),
    ('ACCOUNTANT', 'SACCO accountant'),
    ('DEPUTY_ACCOUNTANT', 'Deputy accountant'),
    ('CASHIER', 'SACCO cashier'),
    ('DEPUTY_CASHIER', 'Deputy cashier'),
    ('LOAN_OFFICER', 'SACCO loan officer'),
    ('DEPUTY_LOAN_OFFICER', 'Deputy loan officer')
ON CONFLICT (name) DO NOTHING;

-- 2) Seed Permissions
INSERT INTO permissions (code, description)
VALUES
    ('USER_READ', 'View user accounts'),
    ('USER_CREATE', 'Create user accounts'),
    ('USER_UPDATE', 'Update user accounts'),
    ('ROLE_READ', 'View roles and permissions'),
    ('ROLE_CREATE', 'Create roles'),
    ('ROLE_UPDATE', 'Update roles'),
    ('MEMBER_READ', 'View member profiles'),
    ('MEMBER_CREATE', 'Create new members'),
    ('MEMBER_UPDATE', 'Update member profiles'),
    ('MEMBER_STATUS_CHANGE', 'Change member status'),
    ('SESSION_READ', 'View active sessions'),
    ('SESSION_REVOKE', 'Revoke/Kill active sessions')
ON CONFLICT (code) DO NOTHING;

-- 3) Map permissions to roles
-- 3a) SYSTEM_ADMIN gets all Phase 1 permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3b) SECRETARY + DEPUTY_SECRETARY
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
                                          'MEMBER_READ', 'MEMBER_CREATE', 'MEMBER_UPDATE', 'MEMBER_STATUS_CHANGE'
    )
WHERE r.name IN ('SECRETARY', 'DEPUTY_SECRETARY')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3c) Everyone else: read-only members
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('MEMBER_READ')
WHERE r.name IN (
                 'CHAIRPERSON', 'DEPUTY_CHAIRPERSON', 'TREASURER', 'DEPUTY_TREASURER',
                 'ACCOUNTANT', 'DEPUTY_ACCOUNTANT', 'CASHIER', 'DEPUTY_CASHIER',
                 'LOAN_OFFICER', 'DEPUTY_LOAN_OFFICER'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;