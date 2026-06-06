-- V82: Add mpesa_ref column to payments table
-- Stores the M-Pesa receipt/reference code (e.g. "UF5BY709I7") separately from
-- the Co-op CBS internal TransactionId (e.g. "CB1287153_05062026_2") which is
-- used for idempotency checks and stored in transaction_ref.
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS mpesa_ref VARCHAR(50);

-- Back-fill existing IPN rows where the Narration was already stored in provider_metadata.
-- For most rows the mpesa_ref is the first tilde-segment of the Co-op Narration field.
-- We attempt a best-effort extraction from the stored JSON; rows with no match stay NULL.
UPDATE payments
SET    mpesa_ref = SPLIT_PART(
           SPLIT_PART(provider_metadata::text, '"Narration":"', 2),
           '~', 1
       )
WHERE  mpesa_ref IS NULL
  AND  payment_method IN ('MPESA_COOP_IPN', 'MPESA_COOP')
  AND  provider_metadata IS NOT NULL
  AND  provider_metadata::text LIKE '%Narration%';
