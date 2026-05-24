-- ==============================================================================
-- V70: Seed permissions for the Asset Management Module (SAC-221)
--
-- NEW PERMISSIONS:
--   ASSET_READ    → View the asset register
--   ASSET_WRITE   → Register new assets
--   ASSET_DISPOSE → Change asset status (dispose / write off / maintenance)
--
-- DEFAULT GRANTS:
--   TREASURER, DEPUTY_TREASURER → all three permissions
--   ADMIN                       → all three permissions
--   SYSTEM_ADMIN                → all three permissions
-- ==============================================================================

INSERT INTO permissions (code, description)
VALUES ('ASSET_READ',    'View the SACCO asset register'),
       ('ASSET_WRITE',   'Register new SACCO-owned assets'),
       ('ASSET_DISPOSE', 'Change asset status (dispose, write off, maintenance)')
ON CONFLICT (code) DO NOTHING;

-- ── SYSTEM_ADMIN gets all new permissions ─────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
  AND p.code IN ('ASSET_READ', 'ASSET_WRITE', 'ASSET_DISPOSE')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── TREASURER + DEPUTY_TREASURER → full access ────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('ASSET_READ', 'ASSET_WRITE', 'ASSET_DISPOSE')
WHERE r.name IN ('TREASURER', 'DEPUTY_TREASURER')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── ADMIN → full access ───────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('ASSET_READ', 'ASSET_WRITE', 'ASSET_DISPOSE')
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── ACCOUNTANT → read + write (no dispose) ────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('ASSET_READ', 'ASSET_WRITE')
WHERE r.name IN ('ACCOUNTANT', 'DEPUTY_ACCOUNTANT')
ON CONFLICT (role_id, permission_id) DO NOTHING;
