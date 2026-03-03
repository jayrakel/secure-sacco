INSERT INTO accounts (id, account_code, account_name, account_type, description, is_active, created_at)
VALUES (
           'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
           '4110',
           'Loan Interest Income',
           'REVENUE',
           'Income generated from loan interest',
           TRUE,
           CURRENT_TIMESTAMP
       ) ON CONFLICT (account_code) DO NOTHING;

ALTER TABLE loan_applications ADD COLUMN prepayment_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00;