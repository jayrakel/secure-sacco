-- Add disposal value and profit/loss to assets
ALTER TABLE sacco_assets
ADD COLUMN disposal_value DECIMAL(19, 4),
ADD COLUMN profit_or_loss DECIMAL(19, 4);

-- Seed P&L GL accounts for asset disposal
INSERT INTO accounts (id, account_code, account_name, account_type, is_active, is_system_account, created_at, description)
VALUES 
    (gen_random_uuid(), '4340', 'Profit on Disposal of Assets', 'REVENUE', TRUE, TRUE, CURRENT_TIMESTAMP, 'Realized profit when an asset is sold above its original cost'),
    (gen_random_uuid(), '5430', 'Loss on Disposal of Assets', 'EXPENSE', TRUE, TRUE, CURRENT_TIMESTAMP, 'Realized loss when an asset is sold below its original cost or written off')
ON CONFLICT (account_code) DO NOTHING;
