-- Sacco settings updates for loans
ALTER TABLE sacco_settings
ADD COLUMN min_savings_to_borrow DECIMAL(15, 2) NOT NULL DEFAULT 5000.00,
ADD COLUMN min_membership_months INT NOT NULL DEFAULT 6,
ADD COLUMN borrowing_multiplier DOUBLE PRECISION NOT NULL DEFAULT 3.0,
ADD COLUMN max_credit_score_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN min_guarantors_count INT NOT NULL DEFAULT 3,
ADD COLUMN guarantor_capacity_pct DOUBLE PRECISION NOT NULL DEFAULT 50.0,
ADD COLUMN processing_fee DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN shares_count_borrowing BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN shares_count_guarantor BOOLEAN NOT NULL DEFAULT false;

-- Loan application updates
ALTER TABLE loan_applications
ADD COLUMN processing_fee_paid BOOLEAN,
ADD COLUMN processing_fee_amount DECIMAL(10, 2),
ADD COLUMN cheque_number VARCHAR(100),
ADD COLUMN cheque_image_url VARCHAR(512),
ADD COLUMN cheque_issued_date TIMESTAMP,
ADD COLUMN cheque_cleared_date TIMESTAMP,
ADD COLUMN disbursement_nominated_member_id UUID;

-- 3-Party Disbursement Approvals
CREATE TABLE loan_disbursement_approvals (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL,
    approver_member_id UUID NOT NULL,
    approver_role VARCHAR(50) NOT NULL,
    approved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_disbursement_app FOREIGN KEY (loan_application_id) REFERENCES loan_applications (id)
);

CREATE INDEX idx_loan_disbursement_app_id ON loan_disbursement_approvals (loan_application_id);

-- Permissions for Loan Disbursement Approvals
INSERT INTO permissions (id, code, description) VALUES
    (gen_random_uuid(), 'LOANS_NOMINATE_DISBURSER', 'Can nominate a member to approve a loan disbursement'),
    (gen_random_uuid(), 'LOANS_DISBURSEMENT_APPROVE', 'Can approve loan disbursement as a chairman, treasurer, or nominated member')
ON CONFLICT (code) DO NOTHING;

-- Map to Admin and Operational Roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('ROLE_SYSTEM_ADMIN', 'ROLE_ADMIN', 'ROLE_CHAIRMAN') AND p.code = 'LOANS_NOMINATE_DISBURSER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('ROLE_SYSTEM_ADMIN', 'ROLE_ADMIN', 'ROLE_CHAIRMAN', 'ROLE_TREASURER') AND p.code = 'LOANS_DISBURSEMENT_APPROVE'
ON CONFLICT (role_id, permission_id) DO NOTHING;
