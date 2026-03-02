CREATE TABLE IF NOT EXISTS payments (
                                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction Identifiers
                                        transaction_ref VARCHAR(100) UNIQUE,        -- The provider's reference (e.g., M-Pesa Receipt Number like 'NLJ7RT615V')
                                        internal_ref VARCHAR(100) UNIQUE NOT NULL,  -- Your internal unique reference for tracking (e.g., for STK push tracking)

    -- Financial Details
                                        amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
                                        currency VARCHAR(10) DEFAULT 'KES',

    -- Payment Context
                                        payment_method VARCHAR(50) NOT NULL,        -- e.g., 'MPESA', 'BANK_TRANSFER'
                                        payment_type VARCHAR(50) NOT NULL,          -- e.g., 'C2B', 'STK_PUSH', 'B2C'
                                        account_reference VARCHAR(100),             -- What the user typed as the account number (e.g., Member Number)

    -- Sender Details
                                        sender_phone_number VARCHAR(20),            -- Phone number that made the payment
                                        sender_name VARCHAR(150),                   -- Extracted from the Daraja C2B/STK payload

    -- State Management
                                        status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- e.g., 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED'

    -- Relationships
                                        member_id UUID REFERENCES members(id) ON DELETE SET NULL, -- Nullable initially, linked after mapping the account_reference

    -- Provider Raw Data (Crucial for Webhooks)
                                        provider_metadata JSONB,                    -- Stores the raw JSON response/callback from M-Pesa for auditing/debugging
                                        failure_reason TEXT,                        -- Stores error descriptions if the transaction fails

    -- Auditing
                                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups (e.g., when a webhook arrives, you need to find the payment quickly)
CREATE INDEX idx_payments_transaction_ref ON payments(transaction_ref);
CREATE INDEX idx_payments_internal_ref ON payments(internal_ref);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_account_reference ON payments(account_reference);

-- Trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_payments_updated_at_column()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_modtime
    BEFORE UPDATE ON payments
    FOR EACH ROW
EXECUTE FUNCTION update_payments_updated_at_column();