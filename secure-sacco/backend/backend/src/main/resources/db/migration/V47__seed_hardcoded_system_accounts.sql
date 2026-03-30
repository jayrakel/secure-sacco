-- ==============================================================================
-- SYSTEM ACCOUNTS SEEDER
-- Ensures every hardcoded GL Code in JournalEntryService.java exists and is active.
-- Uses ON CONFLICT DO NOTHING so it won't break if some already exist.
-- ==============================================================================

-- 1000: General Cash Clearing (Used in postSavingsTransaction)
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '1000', 'Cash Clearing Account', 'ASSET', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 1001: M-Pesa Clearing (Used heavily for Fees, Repayments, Penalties)
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '1001', 'M-Pesa System Clearing', 'ASSET', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 1002: Main Bank Account (Used for Loan Disbursements)
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '1002', 'System Operational Bank', 'ASSET', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 1120: Default M-Pesa Receipt holding (Used in Registration/BOSA templates)
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '1120', 'M-Pesa Receipt Holding', 'ASSET', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 1300: Penalty Principal Receivable
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '1300', 'Penalty Principal Receivable', 'ASSET', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 1310: Penalty Interest Receivable
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '1310', 'Penalty Interest Receivable', 'ASSET', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 2100: Savings Suspense/Transit (Used in postSavingsTransaction)
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '2100', 'Savings Transit Account', 'LIABILITY', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 4120: Penalty Income
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '4120', 'Penalty Income Accrued', 'REVENUE', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 4130: Penalty Interest Income
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '4130', 'Penalty Interest Income', 'REVENUE', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;