-- ==============================================================================
-- V50: Update Loan Summary View to ignore REPLACED ghost schedules
-- ==============================================================================

CREATE OR REPLACE VIEW v_member_loan_summary AS
WITH loan_level_summary AS (
    SELECT
        la.id AS loan_id,
        la.member_id,
        la.prepayment_balance,

        -- 1. Calculate Principal: Ignore PAID and REPLACED (ghost) schedules
        COALESCE(SUM(
                         CASE
                             WHEN lsi.status NOT IN ('PAID', 'REPLACED')
                                 THEN (lsi.principal_due - lsi.principal_paid)
                             ELSE 0
                             END
                 ), 0) AS outstanding_principal,

        -- 2. Calculate Interest: Ignore PAID and REPLACED (ghost) schedules
        COALESCE(SUM(
                         CASE
                             WHEN lsi.status NOT IN ('PAID', 'REPLACED')
                                 THEN (lsi.interest_due - lsi.interest_paid)
                             ELSE 0
                             END
                 ), 0) AS outstanding_interest,

        -- 3. Calculate Arrears: Ignore PAID and REPLACED schedules, check dates
        COALESCE(SUM(
                         CASE
                             WHEN lsi.due_date < CURRENT_DATE AND lsi.status NOT IN ('PAID', 'REPLACED')
                                 THEN (lsi.principal_due + lsi.interest_due - lsi.principal_paid - lsi.interest_paid)
                             ELSE 0
                             END
                 ), 0) AS total_arrears

    FROM loan_applications la
             LEFT JOIN loan_schedule_items lsi ON la.id = lsi.loan_application_id

    -- 4. Strict filter: Only aggregate schedules for truly active loans
    WHERE la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')

    GROUP BY la.id, la.member_id, la.prepayment_balance
)
SELECT
    member_id,
    COUNT(loan_id) AS active_loan_count,
    SUM(outstanding_principal) AS outstanding_principal,
    SUM(outstanding_interest) AS outstanding_interest,
    SUM(total_arrears) AS total_arrears,
    SUM(prepayment_balance) AS total_prepayment_credit
FROM loan_level_summary
GROUP BY member_id;

-- Note: We do not need to recreate v_member_financial_overview because it
-- dynamically reads from v_member_loan_summary, which we just safely replaced!