CREATE TABLE loan_applications (
                                   id UUID PRIMARY KEY,
                                   member_id UUID NOT NULL,
                                   loan_product_id UUID NOT NULL,
                                   principal_amount DECIMAL(15, 2) NOT NULL,
                                   application_fee DECIMAL(10, 2) NOT NULL,
                                   application_fee_paid BOOLEAN DEFAULT FALSE,
                                   application_fee_reference VARCHAR(255),
                                   status VARCHAR(50) NOT NULL,
                                   purpose TEXT,
                                   verified_by UUID,
                                   verified_at TIMESTAMP,
                                   verification_notes TEXT,
                                   committee_approved_by UUID,
                                   committee_approved_at TIMESTAMP,
                                   committee_notes TEXT,
                                   disbursed_by UUID,
                                   disbursed_at TIMESTAMP,
                                   created_at TIMESTAMP NOT NULL,
                                   updated_at TIMESTAMP,
                                   CONSTRAINT fk_loan_app_product FOREIGN KEY (loan_product_id) REFERENCES loan_products(id)
);

CREATE INDEX idx_loan_app_member_id ON loan_applications(member_id);
CREATE INDEX idx_loan_app_status ON loan_applications(status);

CREATE TABLE loan_guarantors (
                                 id UUID PRIMARY KEY,
                                 loan_application_id UUID NOT NULL,
                                 guarantor_member_id UUID NOT NULL,
                                 guaranteed_amount DECIMAL(15, 2) NOT NULL,
                                 status VARCHAR(50) NOT NULL,
                                 created_at TIMESTAMP NOT NULL,
                                 updated_at TIMESTAMP,
                                 CONSTRAINT fk_guarantor_loan_app FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id)
);

CREATE INDEX idx_loan_guarantor_app_id ON loan_guarantors(loan_application_id);
CREATE INDEX idx_loan_guarantor_member_id ON loan_guarantors(guarantor_member_id);