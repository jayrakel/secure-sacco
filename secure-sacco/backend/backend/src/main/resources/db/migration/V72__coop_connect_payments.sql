-- ================================================================
-- PAY-01: Migrate payments table from Daraja to Co-op Connect
--
-- Changes:
--   1. payments.payment_method values updated (MPESA → MPESA_COOP)
--   2. payments.payment_type values updated (STK_PUSH stays, add IPN type)
--   3. payments.internal_ref - already stores MessageReference, no change
-- ================================================================

-- Update existing payment_method values if any Daraja records exist
UPDATE payments
SET payment_method = 'MPESA_COOP'
WHERE payment_method = 'MPESA';

-- Add a provider column to distinguish STK vs IPN payments
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS provider VARCHAR(30) DEFAULT 'COOP_CONNECT';

-- Back-fill for any existing rows
UPDATE payments SET provider = 'DARAJA' WHERE provider IS NULL AND created_at < NOW();

COMMENT ON COLUMN payments.provider IS 'Payment gateway provider: COOP_CONNECT or DARAJA (legacy)';