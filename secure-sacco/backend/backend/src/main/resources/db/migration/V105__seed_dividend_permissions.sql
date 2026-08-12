-- =============================================================================
-- V105: Seed Dividend Permissions
-- =============================================================================

INSERT INTO permissions (code, description)
VALUES
    ('DIVIDENDS_MANAGE', 'Declare and manage dividends'),
    ('DIVIDENDS_READ', 'View dividend declarations')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
  AND p.code IN ('DIVIDENDS_MANAGE', 'DIVIDENDS_READ')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name IN ('TREASURER', 'CHAIRPERSON', 'ACCOUNTANT')
  AND p.code = 'DIVIDENDS_READ'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'TREASURER'
  AND p.code = 'DIVIDENDS_MANAGE'
ON CONFLICT (role_id, permission_id) DO NOTHING;
