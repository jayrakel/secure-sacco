-- ============================================================
-- SAV-02-BE-01: Savings Obligations Schema
-- ============================================================

-- Obligation plan: "member X must save KES Y every WEEKLY/MONTHLY"
CREATE TABLE savings_obligations (
                                     id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     member_id         UUID NOT NULL,
                                     frequency         VARCHAR(20) NOT NULL CHECK (frequency IN ('WEEKLY', 'MONTHLY')),
                                     amount_due        DECIMAL(15, 2) NOT NULL CHECK (amount_due > 0),
                                     start_date        DATE NOT NULL,
                                     grace_days        INT NOT NULL DEFAULT 0 CHECK (grace_days >= 0),
                                     status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED')),
                                     created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                     updated_at        TIMESTAMPTZ,
                                     CONSTRAINT fk_obligation_member FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX idx_obligations_member ON savings_obligations(member_id);
CREATE INDEX idx_obligations_status  ON savings_obligations(status);

-- Period tracking: one row per frequency window per obligation
CREATE TABLE savings_obligation_periods (
                                            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                            obligation_id     UUID NOT NULL,
                                            period_start      DATE NOT NULL,
                                            period_end        DATE NOT NULL,
                                            required_amount   DECIMAL(15, 2) NOT NULL,
                                            paid_amount       DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
                                            status            VARCHAR(20) NOT NULL DEFAULT 'DUE' CHECK (status IN ('DUE', 'COVERED', 'OVERDUE')),
                                            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                            updated_at        TIMESTAMPTZ,
                                            CONSTRAINT fk_period_obligation  FOREIGN KEY (obligation_id) REFERENCES savings_obligations(id) ON DELETE CASCADE,
                                            CONSTRAINT uq_period_start       UNIQUE (obligation_id, period_start)
);

CREATE INDEX idx_obligation_periods_obligation ON savings_obligation_periods(obligation_id);
CREATE INDEX idx_obligation_periods_status      ON savings_obligation_periods(status);

-- ── Permissions ─────────────────────────────────────────────
INSERT INTO permissions (id, code, description) VALUES
                                                                (gen_random_uuid(), 'SAVINGS_OBLIGATIONS_READ',   'View own savings obligation status'),
                                                                (gen_random_uuid(), 'SAVINGS_OBLIGATIONS_MANAGE', 'Create, pause, resume obligations and run evaluation')
ON CONFLICT (code) DO NOTHING;

-- ── Seed the SAVINGS_MISSED_CONTRIBUTION penalty rule ───────
-- (combined here for atomicity with the schema it references)
INSERT INTO penalty_rules (
    id, code, name, description,
    base_amount_type, base_amount_value,
    grace_period_days, interest_period_days, interest_rate, interest_mode,
    is_active, created_at
) VALUES (
             gen_random_uuid(),
             'SAVINGS_MISSED_CONTRIBUTION',
             'Missed Savings Contribution',
             'Charged automatically when a member fails to meet their required savings obligation for a period. Amount is FIXED by default; an admin can edit to PERCENTAGE of the shortfall.',
             'FIXED',
             100.00,
             0,
             30,
             0.00,
             'SIMPLE',
             TRUE,
             NOW()
         ) ON CONFLICT (code) DO NOTHING;