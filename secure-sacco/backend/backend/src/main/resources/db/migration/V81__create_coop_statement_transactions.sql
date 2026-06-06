-- Stores mini-statement transactions fetched from Co-op Bank every 15 minutes.
-- Deduplication by transaction_id prevents double-inserts.
-- Accumulates full history over time — no 10-transaction cap.

CREATE TABLE IF NOT EXISTS coop_statement_transactions (
                                                           id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id           VARCHAR(64)    NOT NULL UNIQUE,  -- Co-op's TransactionId e.g. CB0592306
    transaction_date         TIMESTAMP,
    value_date               TIMESTAMP,
    narration                TEXT,
    raw_narration            TEXT,
    transaction_type         VARCHAR(2)     NOT NULL,          -- CR or DR
    credit_amount            DECIMAL(15,2)  NOT NULL DEFAULT 0,
    debit_amount             DECIMAL(15,2)  NOT NULL DEFAULT 0,
    amount                   DECIMAL(15,2)  NOT NULL DEFAULT 0, -- computed: credit or debit
    running_cleared_balance  DECIMAL(15,2),
    transaction_reference    VARCHAR(64),
    sender_phone             VARCHAR(20),
    account_number           VARCHAR(30),
    -- Reconciliation fields
    reconciled               BOOLEAN        NOT NULL DEFAULT FALSE,
    member_id                UUID           REFERENCES members(id) ON DELETE SET NULL,
    reconciled_at            TIMESTAMP,
    reconciled_by            UUID           REFERENCES users(id) ON DELETE SET NULL,
    notes                    TEXT,
    -- Audit
    fetched_at               TIMESTAMP      NOT NULL DEFAULT NOW(),
    created_at               TIMESTAMP      NOT NULL DEFAULT NOW()
    );

CREATE INDEX idx_coop_stmt_txn_date       ON coop_statement_transactions(value_date DESC);
CREATE INDEX idx_coop_stmt_txn_type       ON coop_statement_transactions(transaction_type);
CREATE INDEX idx_coop_stmt_reconciled     ON coop_statement_transactions(reconciled);
CREATE INDEX idx_coop_stmt_member         ON coop_statement_transactions(member_id);
CREATE INDEX idx_coop_stmt_phone          ON coop_statement_transactions(sender_phone);