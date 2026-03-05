-- 1. SAVINGS VIEW
CREATE OR REPLACE VIEW v_member_savings_balance AS
SELECT
    sa.member_id,
    COALESCE(SUM(
        CASE
            WHEN st.type = 'DEPOSIT' THEN st.amount
            WHEN st.type = 'WITHDRAWAL' THEN -st.amount
            ELSE 0
        END
    ), 0) AS total_savings_balance
FROM savings_accounts sa
LEFT JOIN savings_transactions st ON sa.id = st.savings_account_id AND st.status = 'POSTED'
WHERE sa.status = 'ACTIVE'
GROUP BY sa.member_id;

-- 2. LOAN SUMMARY VIEW
-- Uses a CTE to group at the loan level first (to prevent duplicating prepayment_credit), then groups by member
CREATE OR REPLACE VIEW v_member_loan_summary AS
WITH loan_level_summary AS (
    SELECT
        la.id AS loan_id,
        la.member_id,
        la.prepayment_balance,
        COALESCE(SUM(lsi.principal_due - lsi.principal_paid), 0) AS outstanding_principal,
        COALESCE(SUM(lsi.interest_due - lsi.interest_paid), 0) AS outstanding_interest,
        COALESCE(SUM(
                         CASE
                             WHEN lsi.due_date < CURRENT_DATE AND lsi.status != 'PAID'
                                 THEN (lsi.principal_due + lsi.interest_due - lsi.principal_paid - lsi.interest_paid)
                             ELSE 0
                             END
                 ), 0) AS total_arrears
    FROM loan_applications la
             LEFT JOIN loan_schedule_items lsi ON la.id = lsi.loan_application_id
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

-- 3. PENALTY SUMMARY VIEW
CREATE OR REPLACE VIEW v_member_penalty_summary AS
SELECT
    member_id,
    COUNT(id) AS open_penalty_count,
    COALESCE(SUM(outstanding_amount), 0) AS penalty_outstanding
FROM penalties
WHERE status = 'OPEN'
GROUP BY member_id;

-- 4. UNIFIED FINANCIAL OVERVIEW VIEW (The Ultimate Reporting Source)
CREATE OR REPLACE VIEW v_member_financial_overview AS
SELECT
    m.id AS member_id,
    m.member_number,
    u.first_name,
    u.last_name,
    COALESCE(s.total_savings_balance, 0) AS total_savings,
    COALESCE(l.outstanding_principal, 0) AS loan_principal,
    COALESCE(l.outstanding_interest, 0) AS loan_interest,
    COALESCE(l.total_arrears, 0) AS loan_arrears,
    COALESCE(l.total_prepayment_credit, 0) AS loan_credit,
    COALESCE(p.penalty_outstanding, 0) AS penalty_outstanding
FROM members m
         LEFT JOIN users u ON m.id = u.member_id
         LEFT JOIN v_member_savings_balance s ON m.id = s.member_id
         LEFT JOIN v_member_loan_summary l ON m.id = l.member_id
         LEFT JOIN v_member_penalty_summary p ON m.id = p.member_id;

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_loan_sched_due_date ON loan_schedule_items(due_date);
CREATE INDEX IF NOT EXISTS idx_loan_sched_status ON loan_schedule_items(status);

-- 6. ADD REPORTING PERMISSION
INSERT INTO permissions (id, code, description) VALUES
    ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'REPORTS_READ', 'Can view analytical reports')
ON CONFLICT (code) DO NOTHING;