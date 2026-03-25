-- =============================================================================
-- V43: Fix operational role permissions
--
-- ROOT CAUSE: V1_1 granted every non-secretary staff role only MEMBER_READ.
-- All subsequent permission seeds (LOANS_*, SAVINGS_*, REPORTS_READ,
-- MEMBERS_READ, MEMBERS_WRITE, GL_TRIAL_BALANCE, MEETINGS_*, PENALTIES_*,
-- SAVINGS_OBLIGATIONS_*) were seeded but only granted to SYSTEM_ADMIN via
-- V32's cross-join, leaving every operational role unable to perform their
-- core duties.
--
-- Additionally, MEMBERS_READ (V5) is distinct from MEMBER_READ (V1_1).
-- MemberController uses MEMBERS_READ, so all staff including SECRETARY
-- received 403 on the member list despite having MEMBER_READ.
--
-- This migration grants each role exactly the permissions their job requires.
-- All INSERTs are idempotent (ON CONFLICT DO NOTHING).
-- =============================================================================

-- ─── TREASURER ────────────────────────────────────────────────────────────────
-- Primary financial officer: disburses loans, views savings, reads all reports,
-- waives penalties, manages savings obligation compliance.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'LOANS_READ',
    'LOANS_DISBURSE',
    'REPORTS_READ',
    'SAVINGS_READ',
    'SAVINGS_OBLIGATIONS_MANAGE',
    'PENALTIES_WAIVE_ADJUST'
    )
WHERE r.name = 'TREASURER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── DEPUTY TREASURER ─────────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'LOANS_READ',
    'REPORTS_READ',
    'SAVINGS_READ'
    )
WHERE r.name = 'DEPUTY_TREASURER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── LOAN OFFICER ─────────────────────────────────────────────────────────────
-- Performs first-level loan verification.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'LOANS_READ',
    'LOANS_APPROVE'
    )
WHERE r.name = 'LOAN_OFFICER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── DEPUTY LOAN OFFICER ──────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'LOANS_READ',
    'LOANS_APPROVE'
    )
WHERE r.name = 'DEPUTY_LOAN_OFFICER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── CASHIER ──────────────────────────────────────────────────────────────────
-- Handles cash deposits and withdrawals to savings accounts.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'SAVINGS_READ',
    'SAVINGS_MANUAL_POST'
    )
WHERE r.name = 'CASHIER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── DEPUTY CASHIER ───────────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'SAVINGS_READ',
    'SAVINGS_MANUAL_POST'
    )
WHERE r.name = 'DEPUTY_CASHIER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── CHAIRPERSON ──────────────────────────────────────────────────────────────
-- Chairs the loan committee and reads financial reports.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'REPORTS_READ',
    'LOANS_COMMITTEE_APPROVE'
    )
WHERE r.name = 'CHAIRPERSON'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── DEPUTY CHAIRPERSON ───────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'REPORTS_READ'
    )
WHERE r.name = 'DEPUTY_CHAIRPERSON'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── SECRETARY ────────────────────────────────────────────────────────────────
-- Manages the member register. MEMBERS_READ + MEMBERS_WRITE are the V5
-- permissions used by MemberController (distinct from the V1_1 MEMBER_READ).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'MEMBERS_WRITE'
    )
WHERE r.name = 'SECRETARY'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── DEPUTY SECRETARY ─────────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'MEMBERS_WRITE'
    )
WHERE r.name = 'DEPUTY_SECRETARY'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── ACCOUNTANT ───────────────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'REPORTS_READ',
    'SAVINGS_READ'
    )
WHERE r.name = 'ACCOUNTANT'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── DEPUTY ACCOUNTANT ────────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN (
    'MEMBERS_READ',
    'REPORTS_READ'
    )
WHERE r.name = 'DEPUTY_ACCOUNTANT'
ON CONFLICT (role_id, permission_id) DO NOTHING;
