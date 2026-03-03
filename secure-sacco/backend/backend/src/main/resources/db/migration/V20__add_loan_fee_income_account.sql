INSERT INTO accounts (id, account_code, account_name, account_type, description, is_active, created_at)
VALUES (
           'e2d78c3c-8b89-4a77-8c33-4a1a5b8a6a55',
           '4100',
           'Loan Application Fee Income',
           'REVENUE',
           'Income generated from member loan application fees',
           TRUE,
           CURRENT_TIMESTAMP
       ) ON CONFLICT (account_code) DO NOTHING;