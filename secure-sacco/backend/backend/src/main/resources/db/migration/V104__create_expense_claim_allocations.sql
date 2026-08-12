-- ==============================================================================
-- V104: Create expense_claim_allocations table
--
-- Tracks the specific payment product allocations for an expense claim reimbursement.
-- ==============================================================================

CREATE TABLE expense_claim_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_claim_id UUID NOT NULL,
    product_id UUID NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_eca_expense_claim FOREIGN KEY (expense_claim_id) REFERENCES expense_claims (id) ON DELETE CASCADE,
    CONSTRAINT fk_eca_payment_product FOREIGN KEY (product_id) REFERENCES payment_products (id),
    CONSTRAINT chk_eca_amount CHECK (amount > 0)
);

CREATE INDEX idx_eca_expense_claim_id ON expense_claim_allocations (expense_claim_id);
