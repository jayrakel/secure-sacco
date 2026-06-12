-- =============================================================================
-- V84: Re-sync SYSTEM_ADMIN permissions
--
-- ROOT CAUSE: V32 performed a blanket CROSS JOIN to grant all permissions to
-- SYSTEM_ADMIN, but it ran before several subsequent migrations created new
-- permissions. Those later migrations each explicitly granted new permissions
-- to operational roles (V43, V60, V68, V70, V80) but V41 forgot to grant
-- SAVINGS_OBLIGATIONS_MANAGE and SAVINGS_OBLIGATIONS_READ to SYSTEM_ADMIN.
--
-- Symptoms:
--   • SYSTEM_ADMIN gets HTTP 403 on /api/v1/obligations/compliance (Savings Compliance tab)
--   • SAVINGS_OBLIGATIONS_MANAGE and SAVINGS_OBLIGATIONS_READ appear as
--     ungranted in the Roles & Permissions UI but can't be toggled on
--     because the UI protects SYSTEM_ADMIN toggles
--
-- Fix: Blanket CROSS JOIN grant — safe, idempotent, catches any future gaps.
-- =============================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;