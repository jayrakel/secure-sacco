-- Link payments directly to the member who initiated them
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
