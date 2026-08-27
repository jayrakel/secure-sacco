-- Add equity_ref column to store Jenga/Equity Bank references
ALTER TABLE payments ADD COLUMN equity_ref VARCHAR(100);
