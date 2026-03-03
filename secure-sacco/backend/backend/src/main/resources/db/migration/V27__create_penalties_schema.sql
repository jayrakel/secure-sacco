INSERT INTO accounts (id, account_code, account_name, account_type, description, is_active, created_at) VALUES
                                                                                                            ('b1a2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '1300', 'Penalty Receivable', 'ASSET', 'Penalties owed by members', TRUE, CURRENT_TIMESTAMP),
                                                                                                            ('c2b3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', '4120', 'Penalty Income', 'REVENUE', 'Income generated from system penalties', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (account_code) DO NOTHING;

CREATE TABLE penalties (
                           id UUID PRIMARY KEY,
                           member_id UUID NOT NULL,
                           reference_type VARCHAR(50),
                           reference_id UUID,
                           penalty_rule_id UUID NOT NULL,
                           original_amount DECIMAL(15, 2) NOT NULL,
                           outstanding_amount DECIMAL(15, 2) NOT NULL,
                           status VARCHAR(50) NOT NULL,
                           created_at TIMESTAMP NOT NULL,
                           updated_at TIMESTAMP,
                           CONSTRAINT fk_penalty_rule FOREIGN KEY (penalty_rule_id) REFERENCES penalty_rules(id)
);

CREATE INDEX idx_penalties_member ON penalties(member_id);
CREATE INDEX idx_penalties_status ON penalties(status);

CREATE TABLE penalty_accruals (
                                  id UUID PRIMARY KEY,
                                  penalty_id UUID NOT NULL,
                                  accrual_kind VARCHAR(20) NOT NULL,
                                  amount DECIMAL(15, 2) NOT NULL,
                                  accrued_at TIMESTAMP NOT NULL,
                                  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
                                  journal_reference VARCHAR(100),
                                  created_at TIMESTAMP NOT NULL,
                                  updated_at TIMESTAMP,
                                  CONSTRAINT fk_accrual_penalty FOREIGN KEY (penalty_id) REFERENCES penalties(id) ON DELETE CASCADE
);

CREATE INDEX idx_penalty_accruals_penalty ON penalty_accruals(penalty_id);