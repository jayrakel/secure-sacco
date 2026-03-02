-- ==========================================
-- 1. JOURNAL ENTRIES (The Header)
-- ==========================================
CREATE TABLE journal_entries (
                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                                 transaction_date DATE NOT NULL,
                                 reference_number VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'JV-2024-001' or an M-Pesa receipt
                                 description TEXT NOT NULL,

                                 status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',   -- DRAFT, POSTED, REVERSED

                                 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journal_entries_date ON journal_entries(transaction_date);
CREATE INDEX idx_journal_entries_ref ON journal_entries(reference_number);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);

-- ==========================================
-- 2. JOURNAL ENTRY LINES (The Debits & Credits)
-- ==========================================
CREATE TABLE journal_entry_lines (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                                     journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
                                     account_id UUID NOT NULL REFERENCES accounts(id),

    -- Crucial for SACCOs: Links a specific debit/credit to a specific member
                                     member_id UUID REFERENCES members(id) ON DELETE SET NULL,

                                     debit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0),
                                     credit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),

                                     description TEXT, -- Optional line-item specific description

                                     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Enforce strict double-entry logic at the DB level:
    -- A line must be EITHER a debit OR a credit, but not both, and not neither.
                                     CONSTRAINT chk_debit_or_credit CHECK (
                                         (debit_amount > 0 AND credit_amount = 0) OR
                                         (debit_amount = 0 AND credit_amount > 0)
                                         )
);

CREATE INDEX idx_je_lines_journal_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_je_lines_account_id ON journal_entry_lines(account_id);
CREATE INDEX idx_je_lines_member_id ON journal_entry_lines(member_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_je_updated_at_column()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_journal_entries_modtime
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_je_updated_at_column();

CREATE TRIGGER update_je_lines_modtime
    BEFORE UPDATE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION update_je_updated_at_column();