-- remove ONLY the old wrongly-seeded product
DELETE FROM loan_products
WHERE name = 'Standard Biashara Loan';

-- create Historical Smart Loan only if it doesn't exist
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
       )
ON CONFLICT (name) DO NOTHING;