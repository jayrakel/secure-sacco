-- =============================================================================
-- V85: Add value_date to savings_transactions
--
-- PURPOSE:
--   The savings compliance evaluation was using postedAt (when the system
--   processed the transaction) instead of the actual payment date. This caused
--   members to be incorrectly fined if their payment was made before the
--   deadline but processed after the compliance job ran.
--
--   value_date = when the payment was actually made (from the bank's ValueDate
--   field on the IPN or mini-statement).
--   postedAt   = when the system created/processed the savings transaction.
--
-- BACKFILL:
--   Joins savings_transactions to coop_transactions via mpesa_ref to populate
--   value_date for existing M-Pesa records. For anything unmatched (cash, manual
--   entries) falls back to posted_at — those were always processed in real time
--   so the dates are equivalent.
-- =============================================================================

ALTER TABLE savings_transactions ADD COLUMN IF NOT EXISTS value_date TIMESTAMP;

-- Backfill from coop_transactions where mpesa_ref matches the savings reference
-- (handles UF93M7W27S style raw refs and PAYBILL-/SAV- prefixed refs)
UPDATE savings_transactions st
SET value_date = ct.value_date
FROM coop_transactions ct
WHERE ct.value_date IS NOT NULL
  AND st.value_date IS NULL
  AND st.channel = 'MPESA'
  AND (
      ct.mpesa_ref = st.reference
   OR ct.mpesa_ref = REPLACE(st.reference, 'SAV-', '')
   OR ct.mpesa_ref = REPLACE(st.reference, 'PAYBILL-', '')
   OR ct.mpesa_ref = REPLACE(st.reference, 'DEP-', '')
  );

-- For anything still null — fall back to posted_at
-- (cash deposits, manual entries, unmatched M-Pesa records)
UPDATE savings_transactions
SET value_date = posted_at
WHERE value_date IS NULL;

-- Index for compliance evaluation query performance
CREATE INDEX IF NOT EXISTS idx_savings_tx_value_date
    ON savings_transactions(value_date);