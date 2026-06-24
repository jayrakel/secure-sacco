-- =============================================================================
-- V91: Unified Manual Payment Recording (SAC-267)
--
-- Lets staff with the right permission record a cash payment received in
-- person, for any module — Savings, Penalty, Loan Repayment, or Custom
-- product — through one wizard: pick member → pick type → (pick the specific
-- penalty/product if applicable) → fill amount → post.
--
-- One umbrella permission rather than per-module ones, since this is a single
-- new feature with a single new endpoint that internally dispatches to each
-- module's existing posting logic (re-using SAC-261's CUSTOM GL pattern,
-- penalty/loan repayment engines, and the existing manual savings deposit
-- endpoint).
-- =============================================================================

INSERT INTO permissions (code, description)
VALUES ('MANUAL_PAYMENT_POST', 'Can manually record a cash payment for any module — savings, penalty, loan, or custom product')
ON CONFLICT (code) DO NOTHING;

-- Grant to roles that already have SAVINGS_MANUAL_POST — they're already
-- trusted to handle cash collection, so the new umbrella permission follows
-- the same trust boundary rather than requiring separate admin setup.
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions existing ON existing.id = rp.permission_id AND existing.code = 'SAVINGS_MANUAL_POST'
JOIN permissions p ON p.code = 'MANUAL_PAYMENT_POST'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Safety net matching the V32 precedent — ensure SYSTEM_ADMIN always has
-- every permission, regardless of how its role_permissions rows were seeded.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'SYSTEM_ADMIN' AND p.code = 'MANUAL_PAYMENT_POST'
ON CONFLICT (role_id, permission_id) DO NOTHING;