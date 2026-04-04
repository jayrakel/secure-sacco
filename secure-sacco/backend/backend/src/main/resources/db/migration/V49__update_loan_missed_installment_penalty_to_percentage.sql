-- ============================================================
-- V49: Update LOAN_MISSED_INSTALLMENT penalty rule
-- Change from FIXED KES 500 to PERCENTAGE 20% of shortfall
--
-- Business rule: When a member misses or underpays a weekly
-- loan installment, the penalty is 20% of the shortfall amount.
-- For a fully missed week, shortfall = weekly installment amount.
-- ============================================================

UPDATE penalty_rules
SET
    base_amount_type  = 'PERCENTAGE',
    base_amount_value = 20.00,
    description       = 'Applied automatically when a member underpays or misses a weekly loan installment. Penalty = 20% of the shortfall amount.',
    updated_at        = now()
WHERE code = 'LOAN_MISSED_INSTALLMENT';