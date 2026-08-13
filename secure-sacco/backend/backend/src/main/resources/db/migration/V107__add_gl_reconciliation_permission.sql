-- V107: Add GL_RECONCILIATION permission and grant to ACCOUNTANT and SYSTEM_ADMIN

INSERT INTO permissions (code, description) 
VALUES ('GL_RECONCILIATION', 'Can view and execute general ledger and bank reconciliations')
ON CONFLICT (code) DO NOTHING;

-- Grant to SYSTEM_ADMIN and ACCOUNTANT
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'GL_RECONCILIATION'
WHERE r.name IN ('ROLE_SYSTEM_ADMIN', 'ROLE_ACCOUNTANT')
ON CONFLICT DO NOTHING;
