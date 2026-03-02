-- ==========================================
-- 1. ROOT ACCOUNTS (The 5 Pillars)
-- ==========================================
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, description) VALUES
                                                                                                    ('1000', 'Assets', 'ASSET', true, 'Root account for all assets'),
                                                                                                    ('2000', 'Liabilities', 'LIABILITY', true, 'Root account for all liabilities'),
                                                                                                    ('3000', 'Equity', 'EQUITY', true, 'Root account for all equity'),
                                                                                                    ('4000', 'Revenue', 'REVENUE', true, 'Root account for all income/revenue'),
                                                                                                    ('5000', 'Expenses', 'EXPENSE', true, 'Root account for all expenses');

-- ==========================================
-- 2. LEVEL 2: CATEGORY ACCOUNTS
-- ==========================================
-- Assets Categories
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id) VALUES
                                                                                                          ('1100', 'Current Assets', 'ASSET', true, (SELECT id FROM accounts WHERE account_code = '1000')),
                                                                                                          ('1200', 'Loan Portfolio (Receivables)', 'ASSET', true, (SELECT id FROM accounts WHERE account_code = '1000')),
                                                                                                          ('1300', 'Fixed Assets', 'ASSET', false, (SELECT id FROM accounts WHERE account_code = '1000'));

-- Liability Categories
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id) VALUES
                                                                                                          ('2100', 'Current Liabilities', 'LIABILITY', true, (SELECT id FROM accounts WHERE account_code = '2000')),
                                                                                                          ('2200', 'Member Deposits (Control)', 'LIABILITY', true, (SELECT id FROM accounts WHERE account_code = '2000'));

-- Equity Categories
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id) VALUES
                                                                                                          ('3100', 'Core Capital', 'EQUITY', true, (SELECT id FROM accounts WHERE account_code = '3000')),
                                                                                                          ('3200', 'Reserves & Retained Earnings', 'EQUITY', true, (SELECT id FROM accounts WHERE account_code = '3000'));

-- Revenue Categories
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id) VALUES
                                                                                                          ('4100', 'Interest Income', 'REVENUE', true, (SELECT id FROM accounts WHERE account_code = '4000')),
                                                                                                          ('4200', 'Fee & Commission Income', 'REVENUE', true, (SELECT id FROM accounts WHERE account_code = '4000'));

-- Expense Categories
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id) VALUES
                                                                                                          ('5100', 'Financial Expenses', 'EXPENSE', true, (SELECT id FROM accounts WHERE account_code = '5000')),
                                                                                                          ('5200', 'Operating Expenses', 'EXPENSE', true, (SELECT id FROM accounts WHERE account_code = '5000'));

-- ==========================================
-- 3. LEVEL 3: OPERATIONAL & SYSTEM ACCOUNTS
-- ==========================================

-- [ASSETS] Cash, Banks & Gateways
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id, description) VALUES
                                                                                                                       ('1110', 'Main Bank Account', 'ASSET', false, (SELECT id FROM accounts WHERE account_code = '1100'), 'Standard operational bank account'),
                                                                                                                       ('1120', 'M-Pesa Clearing Account', 'ASSET', true, (SELECT id FROM accounts WHERE account_code = '1100'), 'System Account: Temporary holding for Daraja webhooks before allocation');

-- [ASSETS] Loan Portfolio
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id, description) VALUES
                                                                                                                       ('1210', 'Loan Principal Receivable', 'ASSET', true, (SELECT id FROM accounts WHERE account_code = '1200'), 'System Account: Total outstanding principal owed by members'),
                                                                                                                       ('1220', 'Loan Interest Receivable', 'ASSET', true, (SELECT id FROM accounts WHERE account_code = '1200'), 'System Account: Accrued interest owed by members');

-- [LIABILITIES] Suspense & Payables
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id, description) VALUES
                                                                                                                       ('2110', 'Unallocated Funds (Suspense)', 'LIABILITY', true, (SELECT id FROM accounts WHERE account_code = '2100'), 'System Account: Funds received via M-Pesa lacking clear member mapping'),
                                                                                                                       ('2120', 'Accounts Payable', 'LIABILITY', false, (SELECT id FROM accounts WHERE account_code = '2100'), 'Money the SACCO owes to external vendors');

-- [LIABILITIES] Member Deposits (The core SACCO product)
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id, description) VALUES
                                                                                                                       ('2210', 'Member BOSA Savings (Control)', 'LIABILITY', true, (SELECT id FROM accounts WHERE account_code = '2200'), 'System Account: Aggregate of all members non-withdrawable deposits'),
                                                                                                                       ('2220', 'Member FOSA Savings (Control)', 'LIABILITY', true, (SELECT id FROM accounts WHERE account_code = '2200'), 'System Account: Aggregate of all members withdrawable savings');

-- [EQUITY] Capital
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id, description) VALUES
                                                                                                                       ('3110', 'Member Share Capital', 'EQUITY', true, (SELECT id FROM accounts WHERE account_code = '3100'), 'System Account: Mandatory ownership shares purchased by members'),
                                                                                                                       ('3210', 'Retained Earnings', 'EQUITY', true, (SELECT id FROM accounts WHERE account_code = '3200'), 'System Account: Net profit accumulated over the years');

-- [REVENUE] Income Streams
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id, description) VALUES
                                                                                                                       ('4110', 'Interest on Loans', 'REVENUE', true, (SELECT id FROM accounts WHERE account_code = '4100'), 'System Account: Income generated from loan interest'),
                                                                                                                       ('4210', 'Registration Fees Income', 'REVENUE', true, (SELECT id FROM accounts WHERE account_code = '4200'), 'System Account: Income from new member onboarding'),
                                                                                                                       ('4220', 'Loan Processing Fees', 'REVENUE', true, (SELECT id FROM accounts WHERE account_code = '4200'), 'System Account: Fees charged upon loan disbursement'),
                                                                                                                       ('4230', 'Late Payment Penalties', 'REVENUE', true, (SELECT id FROM accounts WHERE account_code = '4200'), 'System Account: Penalties charged for defaulted loans');

-- [EXPENSES] Costs
INSERT INTO accounts (account_code, account_name, account_type, is_system_account, parent_account_id, description) VALUES
                                                                                                                       ('5110', 'Interest on Member Deposits', 'EXPENSE', true, (SELECT id FROM accounts WHERE account_code = '5100'), 'System Account: Interest paid out to members on their savings'),
                                                                                                                       ('5210', 'Bank & Payment Gateway Charges', 'EXPENSE', true, (SELECT id FROM accounts WHERE account_code = '5200'), 'System Account: Fees charged by Safaricom/Banks for transactions'),
                                                                                                                       ('5220', 'SMS & Communication Costs', 'EXPENSE', false, (SELECT id FROM accounts WHERE account_code = '5200'), 'Operational costs for sending SMS notifications');