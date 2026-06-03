-- Add transaction_type column to payments to distinguish CR (credit) and DR (debit)
-- Existing payments are all credits (money coming into SACCO account)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(2) DEFAULT 'CR';
UPDATE payments SET transaction_type = 'CR' WHERE transaction_type IS NULL;
ALTER TABLE payments ALTER COLUMN transaction_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_transaction_type ON payments(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);