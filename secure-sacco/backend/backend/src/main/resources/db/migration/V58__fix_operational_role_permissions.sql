-- =============================================================================
-- V58: Fix operational role permissions so every role can access the
--      pages and quick-action links shown on their dashboard.
--
-- ROOT CAUSE: Several roles were missing permissions required by the
-- pages their dashboards linked to, causing silent redirects to /dashboard
-- and confusing the user during normal workflows.
--
-- CHAIRPERSON needs LOANS_READ → to reach the LoanManagementPage and
--   perform committee-level approval (LOANS_COMMITTEE_APPROVE is useless
--   without being able to view the list first).
--
-- SECRETARY needs MEETINGS_READ + MEETINGS_MANAGE → they organise and
--   record meetings; MEMBERS_READ alone leaves them unable to do their job.
--
-- LOAN_OFFICER needs REPORTS_READ → arrears report is their primary
--   work tool for follow-up on overdue loans.
--
-- CASHIER needs REPORTS_READ → daily collections is their core report.
--
-- TREASURER needs GL_TRIAL_BALANCE → accessing the trial balance page is
--   a standard treasurer function.
--
-- All deputy roles mirror their principals.
-- All INSERTs are idempotent (ON CONFLICT DO NOTHING).
-- =============================================================================

-- ── CHAIRPERSON + DEPUTY ────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('LOANS_READ', 'MEETINGS_READ')
WHERE r.name IN ('CHAIRPERSON', 'DEPUTY_CHAIRPERSON')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── SECRETARY + DEPUTY ──────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('MEETINGS_READ', 'MEETINGS_MANAGE', 'REPORTS_READ')
WHERE r.name IN ('SECRETARY', 'DEPUTY_SECRETARY')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── LOAN OFFICER + DEPUTY ───────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('REPORTS_READ')
WHERE r.name IN ('LOAN_OFFICER', 'DEPUTY_LOAN_OFFICER')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── CASHIER + DEPUTY ────────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('REPORTS_READ')
WHERE r.name IN ('CASHIER', 'DEPUTY_CASHIER')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── TREASURER + DEPUTY + ACCOUNTANT ────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
         JOIN permissions p ON p.code IN ('GL_TRIAL_BALANCE')
WHERE r.name IN ('TREASURER', 'DEPUTY_TREASURER', 'ACCOUNTANT', 'DEPUTY_ACCOUNTANT')
ON CONFLICT (role_id, permission_id) DO NOTHING;