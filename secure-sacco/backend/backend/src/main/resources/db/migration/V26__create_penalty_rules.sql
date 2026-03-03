CREATE TABLE penalty_rules (
                               id UUID PRIMARY KEY,
                               code VARCHAR(100) NOT NULL UNIQUE,
                               name VARCHAR(255) NOT NULL,
                               description TEXT,
                               base_amount_type VARCHAR(20) NOT NULL,
                               base_amount_value DECIMAL(15, 2) NOT NULL,
                               grace_period_days INTEGER NOT NULL DEFAULT 0,
                               interest_period_days INTEGER NOT NULL DEFAULT 30,
                               interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
                               interest_mode VARCHAR(20) NOT NULL,
                               is_active BOOLEAN NOT NULL DEFAULT TRUE,
                               created_at TIMESTAMP NOT NULL,
                               updated_at TIMESTAMP
);

CREATE INDEX idx_penalty_rules_code ON penalty_rules(code);

-- Seed the core missed installment rule
-- Fixed penalty of 500 KES, compounding at 5% every 7 days (weekly)
INSERT INTO penalty_rules (
    id, code, name, description, base_amount_type, base_amount_value, grace_period_days, interest_period_days, interest_rate, interest_mode, created_at
) VALUES (
             'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
             'LOAN_MISSED_INSTALLMENT',
             'Missed Loan Installment Penalty',
             'Applied automatically when a member underpays or misses a weekly loan installment.',
             'FIXED',
             500.00,
             0,
             7,
             5.00,
             'COMPOUND',
             CURRENT_TIMESTAMP
         );