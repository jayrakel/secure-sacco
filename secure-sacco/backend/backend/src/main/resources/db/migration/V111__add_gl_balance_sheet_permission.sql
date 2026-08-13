-- V111: Add GL_BALANCE_SHEET permission and grant to ACCOUNTANT and SYSTEM_ADMIN

INSERT INTO permissions (code, description) 
VALUES ('GL_BALANCE_SHEET', 'Can view the balance sheet')
ON CONFLICT (code) DO NOTHING;

-- Grant to SYSTEM_ADMIN and ACCOUNTANT
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'GL_BALANCE_SHEET'
WHERE r.name IN ('SYSTEM_ADMIN', 'ACCOUNTANT')
ON CONFLICT DO NOTHING;
