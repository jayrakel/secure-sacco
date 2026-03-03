INSERT INTO accounts (id, account_code, account_name, account_type, description, is_active, created_at)
VALUES (
           'f3e89d4d-9c90-5b88-9d44-5b2b6c9b7b66',
           '1200',
           'Member Loans Receivable',
           'ASSET',
           'Principal amount owed by members for issued loans',
           TRUE,
           CURRENT_TIMESTAMP
       ) ON CONFLICT (account_code) DO NOTHING;