ALTER TABLE penalties ADD COLUMN principal_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE penalties ADD COLUMN interest_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

CREATE TABLE penalty_repayments (
                                    id UUID PRIMARY KEY,
                                    member_id UUID NOT NULL,
                                    target_penalty_id UUID, -- Null means "Pay ALL open penalties"
                                    amount DECIMAL(15, 2) NOT NULL,
                                    principal_allocated DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                                    interest_allocated DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                                    receipt_number VARCHAR(100),
                                    status VARCHAR(50) NOT NULL,
                                    created_at TIMESTAMP NOT NULL,
                                    updated_at TIMESTAMP,
                                    CONSTRAINT fk_pen_rep_member FOREIGN KEY (member_id) REFERENCES members(id),
                                    CONSTRAINT fk_pen_rep_penalty FOREIGN KEY (target_penalty_id) REFERENCES penalties(id)
);

CREATE INDEX idx_pen_rep_status ON penalty_repayments(status);
CREATE INDEX idx_pen_rep_member ON penalty_repayments(member_id);