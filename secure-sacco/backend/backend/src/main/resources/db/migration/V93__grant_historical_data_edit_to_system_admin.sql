-- =============================================================================
-- V93: Grant HISTORICAL_DATA_EDIT to SYSTEM_ADMIN (SAC-269)
--
-- V92 deliberately withheld this permission from all roles so it could be
-- assigned manually. This migration flips it on for SYSTEM_ADMIN only, so
-- the admin can access the historical-edit API endpoints during the migration
-- verification window.
--
-- Remember: remove this permission, V92, V93, and the entire
-- com.jaytechwave.sacco.modules.admin.historicaledit package before go-live.
-- =============================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code = 'HISTORICAL_DATA_EDIT'
WHERE r.name = 'SYSTEM_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;
