-- V57: Add granular admin permissions for Audit Log and Penalty Rules management.
--
-- AUDIT_LOG_READ  → lets designated non-SYSTEM_ADMIN roles view the audit trail
--                   (e.g. Chairperson oversight). Backend: AuditController updated
--                   to accept this permission in addition to ROLE_SYSTEM_ADMIN.
--
-- PENALTIES_MANAGE_RULES → lets designated roles create/edit penalty rules in the
--                          Settings → Penalties tab. Backend: PenaltyRuleController
--                          updated to accept this in addition to ROLE_SYSTEM_ADMIN.

INSERT INTO permissions (code, description)
VALUES
    ('AUDIT_LOG_READ',         'View the security and operations audit log'),
    ('PENALTIES_MANAGE_RULES', 'Create and edit penalty rules (fine amounts, tiers, thresholds)')
ON CONFLICT (code) DO NOTHING;

-- Grant both new permissions to SYSTEM_ADMIN automatically
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
  AND p.code IN ('AUDIT_LOG_READ', 'PENALTIES_MANAGE_RULES')
ON CONFLICT (role_id, permission_id) DO NOTHING;