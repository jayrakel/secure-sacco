-- =============================================================================
-- V86: Ensure system GL accounts for SAC-241 (bank ledger) exist
--
-- JournalEntryService.postNonMemberBankCredit uses account 2110
-- JournalEntryService.postAccountDebit         uses account 5210
--
-- Both were seeded in V10_1 but not in V47 (the hardcoded system accounts seed).
-- This migration ensures they exist with ON CONFLICT DO NOTHING so it is safe
-- to run against any DB state.
-- =============================================================================

-- 2110: Unallocated Funds (Suspense)
-- Used for non-member bank credits — money received but sender not matched to a member.
-- Treasurer reviews and reclassifies these manually.
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '2110', 'Unallocated Bank Receipts (Suspense)', 'LIABILITY', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

-- 5210: Bank & Payment Gateway Charges
-- Used for debit transactions from Co-op account — bank charges, transfers out, reversals.
-- Accountant can reclassify individual entries to more specific expense accounts.
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at)
VALUES (gen_random_uuid(), '5210', 'Bank & Payment Gateway Charges', 'EXPENSE', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;
