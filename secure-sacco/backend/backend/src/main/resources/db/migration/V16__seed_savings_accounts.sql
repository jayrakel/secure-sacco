-- Ensure Savings Liability account exists (Account Type: LIABILITY)
INSERT INTO accounts (id, account_code, account_name, description, account_type, is_active, is_system_account)
VALUES (gen_random_uuid(), '2100', 'Member Savings', 'Liability account holding all member savings deposits', 'LIABILITY', true, true)
ON CONFLICT (account_code) DO NOTHING;

-- Ensure Cash and MPesa accounts exist (Account Type: ASSET)
INSERT INTO accounts (id, account_code, account_name, description, account_type, is_active, is_system_account)
VALUES (gen_random_uuid(), '1000', 'Cash on Hand', 'Physical cash in the SACCO office', 'ASSET', true, true)
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO accounts (id, account_code, account_name, description, account_type, is_active, is_system_account)
VALUES (gen_random_uuid(), '1001', 'M-Pesa Clearing', 'Funds held in M-Pesa paybill/till', 'ASSET', true, true)
ON CONFLICT (account_code) DO NOTHING;