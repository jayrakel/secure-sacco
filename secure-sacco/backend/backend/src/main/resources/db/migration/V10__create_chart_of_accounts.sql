CREATE TABLE accounts (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                          account_code VARCHAR(50) UNIQUE NOT NULL,      -- e.g., '1000', '1100', '4000'
                          account_name VARCHAR(150) NOT NULL,            -- e.g., 'Cash in Bank', 'Registration Fees'
                          description TEXT,

                          account_type VARCHAR(50) NOT NULL,             -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE

                          is_active BOOLEAN DEFAULT TRUE NOT NULL,
                          is_system_account BOOLEAN DEFAULT FALSE NOT NULL, -- True if the application relies on this exact account to function

                          parent_account_id UUID REFERENCES accounts(id),   -- Self-referencing for hierarchical grouping

                          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_account_code ON accounts(account_code);
CREATE INDEX idx_accounts_account_type ON accounts(account_type);
CREATE INDEX idx_accounts_parent_id ON accounts(parent_account_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_accounts_updated_at_column()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_modtime
    BEFORE UPDATE ON accounts
    FOR EACH ROW
EXECUTE FUNCTION update_accounts_updated_at_column();