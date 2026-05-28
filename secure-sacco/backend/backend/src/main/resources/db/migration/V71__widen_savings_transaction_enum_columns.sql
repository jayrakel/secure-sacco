-- V71: Widen savings_transactions enum columns to accommodate EXPENSE_REIMBURSEMENT (21 chars).
-- Uses conditional DDL so this script is safe to re-run.

-- 1. Drop dependent views (if they exist) before altering columns
DROP VIEW IF EXISTS v_member_financial_overview;
DROP VIEW IF EXISTS v_member_savings_balance;

-- 2. Widen columns only if still at the old size
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'savings_transactions'
          AND column_name = 'type'
          AND character_maximum_length < 30
    ) THEN
        ALTER TABLE savings_transactions
            ALTER COLUMN type    TYPE VARCHAR(30),
            ALTER COLUMN channel TYPE VARCHAR(30),
            ALTER COLUMN status  TYPE VARCHAR(30);
    END IF;
END$$;

-- 3. Recreate v_member_savings_balance (counts EXPENSE_REIMBURSEMENT as a credit)
CREATE OR REPLACE VIEW v_member_savings_balance AS
SELECT
    sa.member_id,
    COALESCE(SUM(
        CASE
            WHEN st.type = 'DEPOSIT'               THEN st.amount
            WHEN st.type = 'EXPENSE_REIMBURSEMENT'  THEN st.amount
            WHEN st.type = 'WITHDRAWAL'             THEN -st.amount
            ELSE 0
        END
    ), 0) AS total_savings_balance
FROM savings_accounts sa
LEFT JOIN savings_transactions st ON sa.id = st.savings_account_id AND st.status = 'POSTED'
WHERE sa.status = 'ACTIVE'
GROUP BY sa.member_id;

-- 4. Recreate v_member_financial_overview (unchanged from V31)
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
