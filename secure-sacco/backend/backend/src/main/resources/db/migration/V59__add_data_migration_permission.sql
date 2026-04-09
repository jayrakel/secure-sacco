-- =============================================================================
-- V59: Add DATA_MIGRATION permission so the System Admin can grant
--      historical data migration access to specific trusted users
--      without giving them full ROLE_SYSTEM_ADMIN.
--
-- Use case: A data entry operator who only needs to import historical
--           records but should not have access to system settings,
--           user management, or other admin functions.
--
-- All migration endpoints in MigrationController are updated to accept
-- hasAnyAuthority('DATA_MIGRATION', 'ROLE_SYSTEM_ADMIN').
-- =============================================================================

INSERT INTO permissions (code, description)
VALUES ('DATA_MIGRATION', 'Import historical member, savings, loan and penalty data via the Migration tool')
ON CONFLICT (code) DO NOTHING;

-- Auto-grant to SYSTEM_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
  AND p.code = 'DATA_MIGRATION'
ON CONFLICT (role_id, permission_id) DO NOTHING;