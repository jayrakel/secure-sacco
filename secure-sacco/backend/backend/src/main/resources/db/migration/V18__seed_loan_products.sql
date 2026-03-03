INSERT INTO loan_products (
    id, name, description, repayment_frequency, term_weeks, interest_model, interest_rate, application_fee, grace_period_days, is_active, created_at
) VALUES (
             '8c4d2994-4b53-4814-9964-6f0a3ecbc33b',
             'Standard Biashara Loan',
             'A standard short-term loan for business growth, repaid weekly over 12 weeks.',
             'WEEKLY',
             12,
             'FLAT',
             5.00,
             500.00,
             7,
             TRUE,
             CURRENT_TIMESTAMP
         );