-- ==============================================================================
-- COMPREHENSIVE CHART OF ACCOUNTS SEEDER
-- Exhaustive list for SACCO/MFI Operations
-- Skips existing accounts via ON CONFLICT DO NOTHING
-- ==============================================================================

-- ---------------------------------------------------------
-- 1. ADD MISSING CATEGORY ACCOUNTS (Level 2)
-- ---------------------------------------------------------
INSERT INTO accounts (id, account_code, account_name, account_type, is_system_account, parent_account_id) VALUES
                                                                                                              (gen_random_uuid(), '1400', 'Other Current Assets', 'ASSET', false, (SELECT id FROM accounts WHERE account_code = '1000')),
                                                                                                              (gen_random_uuid(), '1600', 'Long-term Investments', 'ASSET', false, (SELECT id FROM accounts WHERE account_code = '1000')),
                                                                                                              (gen_random_uuid(), '4300', 'Other Income', 'REVENUE', false, (SELECT id FROM accounts WHERE account_code = '4000')),
                                                                                                              (gen_random_uuid(), '5300', 'Admin & Governance Expenses', 'EXPENSE', false, (SELECT id FROM accounts WHERE account_code = '5000')),
                                                                                                              (gen_random_uuid(), '5400', 'Provisions & Depreciation', 'EXPENSE', false, (SELECT id FROM accounts WHERE account_code = '5000'))
ON CONFLICT (account_code) DO NOTHING;


-- ---------------------------------------------------------
-- 2. ASSETS (Level 3)
-- ---------------------------------------------------------

-- Cash & Equivalents (11xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '1111', 'Petty Cash / Till', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1100'), 'Cash kept in the office for daily minor expenses'),
                                                                                                        (gen_random_uuid(), '1112', 'Secondary Bank Account', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1100'), 'Alternative operational bank account')
ON CONFLICT (account_code) DO NOTHING;

-- Loan Portfolio (12xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '1230', 'Penalty Principal Receivable', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1200'), 'Unpaid penalties owed by members'),
                                                                                                        (gen_random_uuid(), '1240', 'Allowance for Loan Losses', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1200'), 'Contra-asset account for provisioned bad debts')
ON CONFLICT (account_code) DO NOTHING;

-- Fixed Assets (13xx - Based on V10_1 using 1300 for Fixed Assets)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '1320', 'Office Equipment', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1300'), 'Printers, scanners, safes, etc.'),
                                                                                                        (gen_random_uuid(), '1321', 'Accumulated Depr - Equipment', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1300'), 'Contra-asset for equipment depreciation'),
                                                                                                        (gen_random_uuid(), '1330', 'Furniture & Fittings', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1300'), 'Desks, chairs, office partitions'),
                                                                                                        (gen_random_uuid(), '1331', 'Accumulated Depr - Furniture', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1300'), 'Contra-asset for furniture depreciation'),
                                                                                                        (gen_random_uuid(), '1340', 'Computers & Software', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1300'), 'Laptops, servers, software licenses'),
                                                                                                        (gen_random_uuid(), '1341', 'Accumulated Depr - Computers', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1300'), 'Contra-asset for computer depreciation')
ON CONFLICT (account_code) DO NOTHING;

-- Other Current Assets & Prepayments (14xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '1410', 'Staff Advances', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1400'), 'Short-term salary advances given to staff'),
                                                                                                        (gen_random_uuid(), '1420', 'Prepaid Rent', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1400'), 'Rent paid in advance'),
                                                                                                        (gen_random_uuid(), '1430', 'Prepaid Insurance', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1400'), 'Insurance premiums paid in advance')
ON CONFLICT (account_code) DO NOTHING;

-- Long Term Investments (16xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
    (gen_random_uuid(), '1610', 'Shares in Co-operative Entities', 'ASSET', (SELECT id FROM accounts WHERE account_code = '1600'), 'Shares held in KUSCCO, Co-op Bank, etc.')
ON CONFLICT (account_code) DO NOTHING;


-- ---------------------------------------------------------
-- 3. LIABILITIES (Level 3)
-- ---------------------------------------------------------

-- Payables & Accruals (21xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '2130', 'Accrued Expenses', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2100'), 'Expenses incurred but not yet paid'),
                                                                                                        (gen_random_uuid(), '2140', 'Withholding Tax Payable', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2100'), 'WHT owed to the Revenue Authority'),
                                                                                                        (gen_random_uuid(), '2150', 'PAYE Payable', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2100'), 'Payroll taxes owed to the Revenue Authority'),
                                                                                                        (gen_random_uuid(), '2160', 'NSSF Payable', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2100'), 'Social security contributions payable'),
                                                                                                        (gen_random_uuid(), '2170', 'NHIF Payable', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2100'), 'Health insurance contributions payable'),
                                                                                                        (gen_random_uuid(), '2180', 'Dividends Payable', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2100'), 'Declared dividends not yet disbursed to members'),
                                                                                                        (gen_random_uuid(), '2190', 'Honoraria Payable', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2100'), 'Approved honoraria for committee members')
ON CONFLICT (account_code) DO NOTHING;

-- Member Deposits (22xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '2230', 'Holiday/Christmas Savings', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2200'), 'Special targeted savings accounts'),
                                                                                                        (gen_random_uuid(), '2240', 'Fixed Deposits', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2200'), 'Time-locked deposits earning premium interest'),
                                                                                                        (gen_random_uuid(), '2250', 'Junior/Children Savings', 'LIABILITY', (SELECT id FROM accounts WHERE account_code = '2200'), 'Accounts held in trust for minors')
ON CONFLICT (account_code) DO NOTHING;


-- ---------------------------------------------------------
-- 4. EQUITY (Level 3)
-- ---------------------------------------------------------
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '3120', 'Institutional Capital', 'EQUITY', (SELECT id FROM accounts WHERE account_code = '3100'), 'Non-distributable capital'),
                                                                                                        (gen_random_uuid(), '3220', 'Statutory Reserve Fund', 'EQUITY', (SELECT id FROM accounts WHERE account_code = '3200'), 'Mandatory reserves required by regulator (e.g., SASRA)'),
                                                                                                        (gen_random_uuid(), '3230', 'General Reserve', 'EQUITY', (SELECT id FROM accounts WHERE account_code = '3200'), 'Voluntary operational reserves'),
                                                                                                        (gen_random_uuid(), '3240', 'Revaluation Reserve', 'EQUITY', (SELECT id FROM accounts WHERE account_code = '3200'), 'Reserves from revaluation of fixed assets')
ON CONFLICT (account_code) DO NOTHING;


-- ---------------------------------------------------------
-- 5. REVENUE (Level 3)
-- ---------------------------------------------------------

-- Interest & Fees (41xx & 42xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '4120', 'Interest on Fixed Deposits', 'REVENUE', (SELECT id FROM accounts WHERE account_code = '4100'), 'Income from Sacco investments in external banks'),
                                                                                                        (gen_random_uuid(), '4240', 'Account Maintenance Fees', 'REVENUE', (SELECT id FROM accounts WHERE account_code = '4200'), 'Monthly/Annual FOSA account fees'),
                                                                                                        (gen_random_uuid(), '4250', 'Early Loan Clearance Fees', 'REVENUE', (SELECT id FROM accounts WHERE account_code = '4200'), 'Fees charged for paying off loans ahead of schedule'),
                                                                                                        (gen_random_uuid(), '4260', 'M-Pesa Transaction Fees Income', 'REVENUE', (SELECT id FROM accounts WHERE account_code = '4200'), 'Markup on withdrawal transactions'),
                                                                                                        (gen_random_uuid(), '4270', 'Passbook/Statement Fees', 'REVENUE', (SELECT id FROM accounts WHERE account_code = '4200'), 'Fees for printing statements or new passbooks')
ON CONFLICT (account_code) DO NOTHING;

-- Other Income (43xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '4310', 'Dividend Income', 'REVENUE', (SELECT id FROM accounts WHERE account_code = '4300'), 'Dividends received from external investments'),
                                                                                                        (gen_random_uuid(), '4320', 'Miscellaneous Income', 'REVENUE', (SELECT id FROM accounts WHERE account_code = '4300'), 'Other undocumented operating income'),
                                                                                                        (gen_random_uuid(), '4330', 'Bad Debt Recoveries', 'REVENUE', (SELECT id FROM accounts WHERE account_code = '4300'), 'Income from loans previously written off')
ON CONFLICT (account_code) DO NOTHING;


-- ---------------------------------------------------------
-- 6. EXPENSES (Level 3)
-- ---------------------------------------------------------

-- Financial & Operational (51xx & 52xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '5120', 'Interest on Bank Loans', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5100'), 'Interest paid by the SACCO on external debt'),
                                                                                                        (gen_random_uuid(), '5130', 'Dividend Expense', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5100'), 'Cost of dividends paid to members'),
                                                                                                        (gen_random_uuid(), '5230', 'Salaries & Wages', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5200'), 'Staff payroll'),
                                                                                                        (gen_random_uuid(), '5240', 'Staff Allowances & Benefits', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5200'), 'Medical, transport, and leave allowances'),
                                                                                                        (gen_random_uuid(), '5250', 'Rent & Rates', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5200'), 'Office leasing costs'),
                                                                                                        (gen_random_uuid(), '5260', 'Printing & Stationery', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5200'), 'Paper, ink, passbooks, and marketing materials'),
                                                                                                        (gen_random_uuid(), '5270', 'Travel & Transport', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5200'), 'Staff travel for operations or debt collection'),
                                                                                                        (gen_random_uuid(), '5280', 'Electricity & Water', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5200'), 'Utilities'),
                                                                                                        (gen_random_uuid(), '5290', 'Internet & Telephone', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5200'), 'Office connectivity and airtime')
ON CONFLICT (account_code) DO NOTHING;

-- Admin, Governance & Provisions (53xx & 54xx)
INSERT INTO accounts (id, account_code, account_name, account_type, parent_account_id, description) VALUES
                                                                                                        (gen_random_uuid(), '5310', 'Committee Allowances', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5300'), 'Sitting fees for Board and Supervisory Committees'),
                                                                                                        (gen_random_uuid(), '5320', 'AGM & Education Expenses', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5300'), 'Costs for member education days and Annual General Meetings'),
                                                                                                        (gen_random_uuid(), '5330', 'Audit Fees', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5300'), 'Payments to external auditors'),
                                                                                                        (gen_random_uuid(), '5340', 'Legal & Professional Fees', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5300'), 'Lawyers, debt collectors, and consultants'),
                                                                                                        (gen_random_uuid(), '5350', 'Licenses & Permits', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5300'), 'County permits, SASRA fees, Data Protection fees'),
                                                                                                        (gen_random_uuid(), '5410', 'Provision for Bad Debts', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5400'), 'Expense recognized to cover expected loan losses'),
                                                                                                        (gen_random_uuid(), '5420', 'Depreciation Expense', 'EXPENSE', (SELECT id FROM accounts WHERE account_code = '5400'), 'Wear and tear on fixed assets')
ON CONFLICT (account_code) DO NOTHING;