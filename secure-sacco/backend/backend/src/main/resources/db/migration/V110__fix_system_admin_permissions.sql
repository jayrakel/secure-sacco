-- V110: Re-sync SYSTEM_ADMIN permissions
-- Grants newly added permissions like GL_RECONCILIATION and DIVIDENDS_MANAGE to SYSTEM_ADMIN

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Also correctly grant GL_RECONCILIATION to ACCOUNTANT since V107 used 'ROLE_ACCOUNTANT'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'GL_RECONCILIATION'
WHERE r.name = 'ACCOUNTANT'
ON CONFLICT DO NOTHING;
