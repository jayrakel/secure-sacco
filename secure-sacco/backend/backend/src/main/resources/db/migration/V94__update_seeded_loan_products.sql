-- Remove old seeded loan
DELETE FROM loan_products
WHERE id = '8c4d2994-4b53-4814-9964-6f0a3ecbc33b';

-- Remove any Historical Smart Loan regardless of UUID
DELETE FROM loan_products
WHERE name = 'Historical Smart Loan';

-- Remove the old Standard Biashara Loan
DELETE FROM loan_products
WHERE name = 'Standard Biashara Loan';

INSERT INTO loan_products (
    id,
    name,
    description,
    repayment_frequency,
    term_weeks,
    interest_model,
    interest_rate,
    application_fee,
    grace_period_days,
    is_active,
    created_at
)
VALUES (
           '95e4047a-34da-41f5-b06e-81760b92983b',
           'Historical Smart Loan',
           'A migration loan for migrating historical loans, repaid weekly over 52 weeks.',
           'WEEKLY',
           52,
           'FLAT',
           10.00,
           1000.00,
           28,
           TRUE,
           CURRENT_TIMESTAMP
       );