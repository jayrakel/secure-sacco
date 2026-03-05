-- =============================================================================
-- V32: Fix SYSTEM_ADMIN missing permission grants + seed missing savings permissions
--
-- ROOT CAUSE: Migrations V21, V30, and V31 added new permissions to the
-- `permissions` table but forgot to grant them to the SYSTEM_ADMIN role.
-- Additionally, SAVINGS_READ and SAVINGS_MANUAL_POST are referenced in
-- @PreAuthorize annotations in SavingsController but were never seeded into
-- the permissions table at all, making it impossible to assign them to any role
-- through the Roles & Permissions UI.
--
-- AFFECTED:
--   - LOANS_READ, LOANS_APPROVE, LOANS_COMMITTEE_APPROVE, LOANS_DISBURSE (V21)
--   - PENALTIES_WAIVE_ADJUST (V30)
--   - REPORTS_READ (V31)
--   - SAVINGS_READ (missing entirely from DB)
--   - SAVINGS_MANUAL_POST (missing entirely from DB)
-- =============================================================================

-- Step 1: Seed the two savings permissions that were missing from the DB entirely.
-- Without these rows, no role can ever be assigned these permissions via the UI.
INSERT INTO permissions (code, description)
VALUES
    ('SAVINGS_READ',        'Can view member savings accounts and statements'),
    ('SAVINGS_MANUAL_POST', 'Can manually post deposits and withdrawals to savings accounts')
ON CONFLICT (code) DO NOTHING;

-- Step 2: Re-grant ALL permissions (including newly seeded ones above and
-- previously orphaned ones from V21/V30/V31) to SYSTEM_ADMIN.
-- This mirrors the original V1_1 approach and is idempotent (ON CONFLICT DO NOTHING).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;