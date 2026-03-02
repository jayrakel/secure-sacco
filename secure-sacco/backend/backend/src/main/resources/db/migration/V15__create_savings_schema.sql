-- Savings Accounts Table
CREATE TABLE savings_accounts (
                                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                  member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
                                  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Savings Transactions Table
CREATE TABLE savings_transactions (
                                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                      savings_account_id UUID NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
                                      type VARCHAR(20) NOT NULL, -- DEPOSIT, WITHDRAWAL
                                      channel VARCHAR(20) NOT NULL, -- CASH, MPESA
                                      amount DECIMAL(19, 2) NOT NULL,
                                      reference VARCHAR(100),
                                      status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, POSTED, FAILED, REVERSED
                                      posted_at TIMESTAMP,
                                      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_savings_tx_account_id ON savings_transactions(savings_account_id);
CREATE INDEX idx_savings_tx_posted_at ON savings_transactions(posted_at);
CREATE INDEX idx_savings_tx_reference ON savings_transactions(reference);