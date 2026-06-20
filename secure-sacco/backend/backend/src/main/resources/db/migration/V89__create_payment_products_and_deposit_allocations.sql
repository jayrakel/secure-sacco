-- =============================================================================
-- V89: Payment Products & Deposit Allocations (SAC-261)
--
-- Lets admins configure payable categories (Savings, Penalties, Loan Repayment,
-- and custom ones like "Meat Contribution") without a code deploy. Each product
-- maps to a GL account and a module_type that decides how a deposit allocated
-- to it gets routed once the M-Pesa payment is confirmed.
-- =============================================================================

CREATE TABLE payment_products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    code            VARCHAR(50)  UNIQUE NOT NULL,
    description     TEXT,
    module_type     VARCHAR(20)  NOT NULL,   -- SAVINGS | PENALTY | LOAN | CUSTOM
    gl_account_id   UUID NOT NULL REFERENCES accounts(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE for SAVINGS/PENALTY/LOAN seeds; cannot be deleted
    display_order   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_payment_products_module_type
        CHECK (module_type IN ('SAVINGS', 'PENALTY', 'LOAN', 'CUSTOM'))
);

CREATE INDEX idx_payment_products_active ON payment_products(is_active);

CREATE TABLE deposit_allocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES payment_products(id),
    percentage      NUMERIC(5,2)  NOT NULL,
    amount          NUMERIC(14,2) NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'PENDING', -- PENDING | ROUTED | FAILED
    failure_reason  TEXT,
    routed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_deposit_allocations_status
        CHECK (status IN ('PENDING', 'ROUTED', 'FAILED'))
);

CREATE INDEX idx_deposit_allocations_payment_id ON deposit_allocations(payment_id);
CREATE INDEX idx_deposit_allocations_status     ON deposit_allocations(status);

-- ── Seed default products mapped to existing GL accounts ────────────────────
-- 2100 Current Liabilities (member savings), 1300 -> replaced; use 2100 for
-- savings credit side, 1200 Loan Portfolio for loan repayment debit-side offset
-- handled by existing LoanRepaymentService, and Penalty Receivable for penalties.

INSERT INTO payment_products (name, code, description, module_type, gl_account_id, is_active, is_system, display_order)
SELECT 'Savings', 'SAVINGS', 'Regular savings contribution', 'SAVINGS', a.id, TRUE, TRUE, 1
FROM accounts a WHERE a.account_code = '2100'
ON CONFLICT (code) DO NOTHING;

INSERT INTO payment_products (name, code, description, module_type, gl_account_id, is_active, is_system, display_order)
SELECT 'Penalty Repayment', 'PENALTY', 'Clear outstanding penalties', 'PENALTY', a.id, TRUE, TRUE, 2
FROM accounts a WHERE a.account_code = '1300'
ON CONFLICT (code) DO NOTHING;

INSERT INTO payment_products (name, code, description, module_type, gl_account_id, is_active, is_system, display_order)
SELECT 'Loan Repayment', 'LOAN', 'Repay an active loan', 'LOAN', a.id, TRUE, TRUE, 3
FROM accounts a WHERE a.account_code = '1200'
ON CONFLICT (code) DO NOTHING;