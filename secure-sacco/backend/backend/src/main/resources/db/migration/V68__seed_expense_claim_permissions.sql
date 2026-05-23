-- ==============================================================================
-- V68: Seed permissions for the Expense Reimbursement Module
--
-- NEW PERMISSIONS:
--   EXPENSE_CLAIMS_READ    → View all submitted expense claims
--   EXPENSE_CLAIMS_APPROVE → Submit claims on behalf of members + approve/reject
--
-- DEFAULT GRANTS:
--   TREASURER, DEPUTY_TREASURER → both permissions
--   ADMIN (operational)         → both permissions
--   SYSTEM_ADMIN                → both permissions (via cross-join)
-- ==============================================================================

INSERT INTO permissions (code, description)
VALUES
    ('EXPENSE_CLAIMS_READ',    'View all member expense reimbursement claims'),
    ('EXPENSE_CLAIMS_APPROVE', 'Submit, approve, or reject member expense reimbursement claims')
ON CONFLICT (code) DO NOTHING;

-- ── SYSTEM_ADMIN gets all new permissions ─────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
  AND p.code IN ('EXPENSE_CLAIMS_READ', 'EXPENSE_CLAIMS_APPROVE')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── TREASURER + DEPUTY_TREASURER → full access (read + approve) ───────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('EXPENSE_CLAIMS_READ', 'EXPENSE_CLAIMS_APPROVE')
WHERE r.name IN ('TREASURER', 'DEPUTY_TREASURER')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── ADMIN (operational role) → full access ────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('EXPENSE_CLAIMS_READ', 'EXPENSE_CLAIMS_APPROVE')
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;
