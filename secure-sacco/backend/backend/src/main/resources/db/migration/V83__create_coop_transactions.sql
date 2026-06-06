-- Unified Co-op transaction store.
-- All Co-op events (IPN, STK callback, mini-statement) are normalised
-- and stored here before being displayed on the frontend.
-- Single source of truth — no raw Co-op data ever hits the UI directly.

CREATE TABLE IF NOT EXISTS coop_transactions (
                                                 id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- De-duplication key (M-Pesa transaction reference e.g. UF5BY709I7)
                                                 mpesa_ref           VARCHAR(64) UNIQUE,
    -- Co-op's own internal ID (e.g. CB1287153_05062026_2) — for audit tracing
                                                 coop_transaction_id VARCHAR(64),

    -- Source that created this record
                                                 source              VARCHAR(30) NOT NULL, -- IPN | STK_CALLBACK | MINI_STATEMENT

    -- Financial
                                                 transaction_type    VARCHAR(2)     NOT NULL,   -- CR | DR
                                                 amount              DECIMAL(15,2)  NOT NULL,
                                                 currency            VARCHAR(3)     DEFAULT 'KES',
                                                 running_balance     DECIMAL(15,2),
                                                 account_number      VARCHAR(30),

    -- Dates
                                                 transaction_date    TIMESTAMP,
                                                 value_date          TIMESTAMP,

    -- Sender (resolved at write time)
                                                 sender_phone        VARCHAR(20),               -- normalised 254XXXXXXXXX
                                                 sender_name         VARCHAR(255),              -- member full name if resolved
                                                 member_id           UUID REFERENCES members(id) ON DELETE SET NULL,

    -- Narration
                                                 display_narration   TEXT,                      -- clean display string
                                                 raw_narration       TEXT,                      -- original from Co-op
                                                 account_reference   VARCHAR(255),              -- internal account ref (DEP-xxx etc)

    -- Reconciliation
                                                 savings_credited    BOOLEAN DEFAULT FALSE,     -- savings account updated?
                                                 savings_credited_at TIMESTAMP,

    -- Raw payload for audit / debugging
                                                 raw_payload         TEXT,

    -- Audit
                                                 created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
                                                 updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coop_txn_date        ON coop_transactions(value_date DESC);
CREATE INDEX idx_coop_txn_type        ON coop_transactions(transaction_type);
CREATE INDEX idx_coop_txn_member      ON coop_transactions(member_id);
CREATE INDEX idx_coop_txn_phone       ON coop_transactions(sender_phone);
CREATE INDEX idx_coop_txn_source      ON coop_transactions(source);
CREATE INDEX idx_coop_txn_credited    ON coop_transactions(savings_credited);