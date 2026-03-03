CREATE TABLE loan_repayments (
                                 id UUID PRIMARY KEY,
                                 loan_application_id UUID NOT NULL,
                                 amount DECIMAL(15, 2) NOT NULL,
                                 principal_allocated DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                                 interest_allocated DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                                 prepayment_allocated DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                                 receipt_number VARCHAR(100),
                                 status VARCHAR(50) NOT NULL,
                                 created_at TIMESTAMP NOT NULL,
                                 updated_at TIMESTAMP,
                                 CONSTRAINT fk_loan_rep_app FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id)
);

CREATE INDEX idx_loan_rep_app_id ON loan_repayments(loan_application_id);
CREATE INDEX idx_loan_rep_status ON loan_repayments(status);