-- V37: Add GL_TRIAL_BALANCE permission and grant to TREASURER, DEPUTY_TREASURER, ACCOUNTANT, and SYSTEM_ADMIN
INSERT INTO permissions (code, description)
VALUES ('GL_TRIAL_BALANCE', 'Can view the General Ledger Trial Balance report')
ON CONFLICT (code) DO NOTHING;

-- Grant to SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, ACCOUNTANT, DEPUTY_ACCOUNTANT
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('SYSTEM_ADMIN', 'TREASURER', 'DEPUTY_TREASURER', 'ACCOUNTANT', 'DEPUTY_ACCOUNTANT')
  AND p.code = 'GL_TRIAL_BALANCE'
ON CONFLICT (role_id, permission_id) DO NOTHING;