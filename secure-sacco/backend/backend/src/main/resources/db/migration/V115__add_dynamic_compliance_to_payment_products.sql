-- Add compliance flags to payment_products
ALTER TABLE payment_products ADD COLUMN IF NOT EXISTS has_deadlines BOOLEAN DEFAULT FALSE;
ALTER TABLE payment_products ADD COLUMN IF NOT EXISTS grace_days INT DEFAULT 0;
ALTER TABLE payment_products ADD COLUMN IF NOT EXISTS attracts_penalties BOOLEAN DEFAULT FALSE;
ALTER TABLE payment_products ADD COLUMN IF NOT EXISTS penalty_rule_id UUID;
ALTER TABLE payment_products ADD CONSTRAINT fk_payment_products_penalty_rule FOREIGN KEY (penalty_rule_id) REFERENCES penalty_rules(id);

-- Create product_allocation_periods table
CREATE TABLE IF NOT EXISTS product_allocation_periods (
    id UUID PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id),
    product_id UUID NOT NULL REFERENCES payment_products(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    required_amount DECIMAL(14,2) NOT NULL,
    paid_amount DECIMAL(14,2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_allocation_periods_member_product ON product_allocation_periods(member_id, product_id);
