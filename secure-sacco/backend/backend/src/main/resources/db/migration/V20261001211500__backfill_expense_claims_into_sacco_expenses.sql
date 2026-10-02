-- ==============================================================================
-- V20261001211500: Backfill approved expense claims into sacco_expenses
--
-- This migration ensures that all historically approved member expense claims
-- are properly recorded in the central sacco_expenses table so that they appear
-- on expense dashboards and reports, without duplicating GL entries.
-- ==============================================================================

INSERT INTO sacco_expenses (
    id,
    expense_date,
    amount,
    gl_account_code,
    narration,
    reference,
    journal_reference,
    created_by_user_id,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    COALESCE(DATE(reviewed_at), CURRENT_DATE),
    amount,
    '5360',
    'Member Expense Reimbursement - ' || description,
    receipt_reference,
    journal_reference,
    reviewed_by_user_id,
    COALESCE(reviewed_at, CURRENT_TIMESTAMP),
    COALESCE(reviewed_at, CURRENT_TIMESTAMP)
FROM expense_claims
WHERE status = 'APPROVED'
  AND journal_reference IS NOT NULL
ON CONFLICT (journal_reference) DO NOTHING;
