-- =============================================================================
-- V60: Make the full accounting module permission-grantable.
--
-- Previously every accounting endpoint was hardcoded to ROLE_SYSTEM_ADMIN,
-- making it impossible for Treasurer, Accountant or any other role to access
-- Chart of Accounts or Journal Entries even if the admin wanted to grant it.
--
-- NEW PERMISSIONS:
--   ACCOUNTING_READ        → View chart of accounts and journal entries
--   ACCOUNTING_WRITE       → Create and edit GL accounts
--   ACCOUNTING_JOURNAL_POST → Post manual journal entries to the GL
--
-- (GL_TRIAL_BALANCE already exists from V38 — no change needed there.)
--
-- DEFAULT GRANTS (mirrors real-world SACCO responsibilities):
--   TREASURER + DEPUTY_TREASURER + ACCOUNTANT + DEPUTY_ACCOUNTANT
--     → ACCOUNTING_READ + GL_TRIAL_BALANCE (already had GL_TRIAL_BALANCE from V58)
--   ACCOUNTANT + DEPUTY_ACCOUNTANT
--     → ACCOUNTING_JOURNAL_POST (accountants post journal entries)
--   SYSTEM_ADMIN
--     → All three (via cross-join)
-- =============================================================================

INSERT INTO permissions (code, description)
VALUES
    ('ACCOUNTING_READ',         'View chart of accounts and journal entries'),
    ('ACCOUNTING_WRITE',        'Create and edit GL accounts'),
    ('ACCOUNTING_JOURNAL_POST', 'Post manual journal entries to the general ledger')
ON CONFLICT (code) DO NOTHING;

-- ── SYSTEM_ADMIN gets all new permissions ────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
  AND p.code IN ('ACCOUNTING_READ', 'ACCOUNTING_WRITE', 'ACCOUNTING_JOURNAL_POST')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── TREASURER + DEPUTY_TREASURER: read accounting, view trial balance ────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('ACCOUNTING_READ', 'GL_TRIAL_BALANCE')
WHERE r.name IN ('TREASURER', 'DEPUTY_TREASURER')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── ACCOUNTANT + DEPUTY_ACCOUNTANT: full accounting (read + write + post) ───
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('ACCOUNTING_READ', 'ACCOUNTING_WRITE', 'ACCOUNTING_JOURNAL_POST', 'GL_TRIAL_BALANCE')
WHERE r.name IN ('ACCOUNTANT', 'DEPUTY_ACCOUNTANT')
ON CONFLICT (role_id, permission_id) DO NOTHING;