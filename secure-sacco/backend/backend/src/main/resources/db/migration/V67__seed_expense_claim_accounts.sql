-- ==============================================================================
-- V67: Seed GL accounts required for the Expense Reimbursement Module
--
-- Double-entry on claim approval:
--   DR 5360 Member Expense Reimbursement  (EXPENSE)
--   CR 2190 Member Reimbursement Payable  (LIABILITY)
--
-- Uses ON CONFLICT DO NOTHING — safe to run on any environment.
-- ==============================================================================

-- Ensure parent accounts exist before inserting children
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '5300', 'Admin & Governance Expenses', 'EXPENSE', TRUE, FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 2190: Member Reimbursement Payable (LIABILITY)
-- The SACCO owes this amount back to the member — it is a current liability
-- until it is settled (paid out or offset against savings).
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, parent_account_id, description, created_at)
VALUES (
    gen_random_uuid(),
    '2190',
    'Member Reimbursement Payable',
    'LIABILITY',
    TRUE,
    TRUE,
    (SELECT id FROM accounts WHERE account_code = '2100'),
    'System Account: Amount owed to members who paid SACCO expenses out of pocket',
    CURRENT_TIMESTAMP
)
ON CONFLICT (account_code) DO NOTHING;

-- 5360: Member Expense Reimbursement (EXPENSE)
-- Records the cost to the SACCO for expenses covered by members.
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, parent_account_id, description, created_at)
VALUES (
    gen_random_uuid(),
    '5360',
    'Member Expense Reimbursement',
    'EXPENSE',
    TRUE,
    TRUE,
    (SELECT id FROM accounts WHERE account_code = '5300'),
    'System Account: Expenses incurred by members on behalf of the SACCO, approved for reimbursement',
    CURRENT_TIMESTAMP
)
ON CONFLICT (account_code) DO NOTHING;
