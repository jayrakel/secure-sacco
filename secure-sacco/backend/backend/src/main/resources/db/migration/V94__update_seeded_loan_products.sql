-- =============================================================================
-- V94: Replace the V18 seeded loan product with the correct Historical Smart Loan
--
-- V18 seeded 'Standard Biashara Loan' with the same UUID that should have been
-- used for 'Historical Smart Loan'. This migration deletes that record and
-- re-inserts the correct one using the same UUID.
-- =============================================================================

DELETE FROM loan_products WHERE id = '8c4d2994-4b53-4814-9964-6f0a3ecbc33b';

INSERT INTO loan_products (
    id, name, description, repayment_frequency, term_weeks, interest_model, interest_rate, application_fee, grace_period_days, is_active, created_at
) VALUES (
             '8c4d2994-4b53-4814-9964-6f0a3ecbc33b',
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
