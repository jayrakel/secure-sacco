-- ==============================================================================
-- V66: Create expense_claims table
--
-- Tracks member expense reimbursement claims. A member pays a SACCO expense
-- out of pocket, then submits a claim. Staff must approve before any financial
-- impact occurs.
--
-- Status lifecycle: PENDING → APPROVED | REJECTED
-- On APPROVED: the system automatically posts a GL journal entry.
-- ==============================================================================

CREATE TABLE expense_claims
(
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id           UUID         NOT NULL,
    amount              NUMERIC(15, 2) NOT NULL,
    description         TEXT         NOT NULL,
    receipt_reference   VARCHAR(255),
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    rejection_reason    TEXT,
    reviewed_by_user_id UUID,
    reviewed_at         TIMESTAMP WITH TIME ZONE,
    journal_reference   VARCHAR(100),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_expense_claim_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT chk_expense_claim_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT chk_expense_claim_amount CHECK (amount > 0)
);

CREATE INDEX idx_expense_claims_member_id ON expense_claims (member_id);
CREATE INDEX idx_expense_claims_status    ON expense_claims (status);
CREATE INDEX idx_expense_claims_created_at ON expense_claims (created_at DESC);
