-- =============================================================================
-- V80: Seed 12 new PBAC permissions and grant to appropriate roles
--
-- Phase B of the PBAC & Audit Migration (PERMISSION_CATALOG.md §2 and §5).
--
-- NEW PERMISSIONS:
--   Settings:      SETTINGS_READ, SETTINGS_EDIT
--   Loans:         LOAN_PRODUCTS_MANAGE
--   Banking:       BANKING_READ, BANKING_MANAGE
--   Member portal: MEMBER_LOANS_VIEW, MEMBER_LOANS_APPLY,
--                  MEMBER_PENALTIES_VIEW, MEMBER_SAVINGS_VIEW,
--                  MEMBER_EXPENSE_SUBMIT, MEMBER_OBLIGATIONS_VIEW,
--                  MEMBER_DASHBOARD_VIEW
--
-- All INSERTs are idempotent (ON CONFLICT DO NOTHING).
-- =============================================================================

-- ── Insert new permissions ───────────────────────────────────────────────────

INSERT INTO permissions (code, description)
VALUES
    ('SETTINGS_READ',           'View SACCO global settings'),
    ('SETTINGS_EDIT',           'Modify SACCO global settings and feature flags'),
    ('LOAN_PRODUCTS_MANAGE',    'Create and edit loan products'),
    ('BANKING_READ',            'View Co-op bank account data and transactions'),
    ('BANKING_MANAGE',          'Initiate banking operations via Co-op Connect'),
    ('MEMBER_LOANS_VIEW',       'View own loan applications and repayment schedule'),
    ('MEMBER_LOANS_APPLY',      'Apply for, submit, and repay own loan applications'),
    ('MEMBER_PENALTIES_VIEW',   'View own penalty records'),
    ('MEMBER_SAVINGS_VIEW',     'View own savings balance and statement; initiate M-Pesa deposit'),
    ('MEMBER_EXPENSE_SUBMIT',   'Submit and view own expense reimbursement claims'),
    ('MEMBER_OBLIGATIONS_VIEW', 'View own savings obligation status and history'),
    ('MEMBER_DASHBOARD_VIEW',   'Access the member portal dashboard')
ON CONFLICT (code) DO NOTHING;

-- ── SYSTEM_ADMIN gets all new permissions ────────────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
  AND p.code IN (
    'SETTINGS_READ', 'SETTINGS_EDIT', 'LOAN_PRODUCTS_MANAGE',
    'BANKING_READ', 'BANKING_MANAGE',
    'MEMBER_LOANS_VIEW', 'MEMBER_LOANS_APPLY', 'MEMBER_PENALTIES_VIEW',
    'MEMBER_SAVINGS_VIEW', 'MEMBER_EXPENSE_SUBMIT',
    'MEMBER_OBLIGATIONS_VIEW', 'MEMBER_DASHBOARD_VIEW'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── SETTINGS_READ + SETTINGS_EDIT: SYSTEM_ADMIN only (already done above) ───
-- No operational role receives settings management by default.

-- ── LOAN_PRODUCTS_MANAGE: SYSTEM_ADMIN only (product configuration) ──────────
-- No operational role receives this by default — loan products are system config.

-- ── BANKING_READ: financial oversight roles ───────────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code = 'BANKING_READ'
WHERE r.name IN ('TREASURER', 'DEPUTY_TREASURER', 'CASHIER', 'DEPUTY_CASHIER',
                 'CHAIRPERSON', 'ACCOUNTANT', 'DEPUTY_ACCOUNTANT')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── BANKING_MANAGE: transaction-initiating roles only ────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code = 'BANKING_MANAGE'
WHERE r.name IN ('TREASURER', 'CASHIER', 'DEPUTY_CASHIER')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── Member portal permissions → MEMBER role ───────────────────────────────────

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBER_LOANS_VIEW', 'MEMBER_LOANS_APPLY',
    'MEMBER_PENALTIES_VIEW', 'MEMBER_SAVINGS_VIEW',
    'MEMBER_EXPENSE_SUBMIT', 'MEMBER_OBLIGATIONS_VIEW',
    'MEMBER_DASHBOARD_VIEW'
)
WHERE r.name = 'MEMBER'
ON CONFLICT (role_id, permission_id) DO NOTHING;
