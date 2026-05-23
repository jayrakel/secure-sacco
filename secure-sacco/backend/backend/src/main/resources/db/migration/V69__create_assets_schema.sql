-- ==============================================================================
-- V69: Create sacco_assets table (SAC-221: Asset Management Module)
--
-- Tracks SACCO-owned fixed assets. No records are ever deleted — lifecycle
-- is managed via the 'status' column only.
--
-- On registration: system posts a GL journal entry (DR asset account / CR bank).
-- On disposal: status change only; manual GL posting via the GL Posting page.
--
-- Status lifecycle: ACTIVE → UNDER_MAINTENANCE → ACTIVE | DISPOSED | WRITTEN_OFF
--                   DISPOSED and WRITTEN_OFF are terminal states.
-- ==============================================================================

CREATE TABLE sacco_assets
(
    id                  UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_name          VARCHAR(200)   NOT NULL,
    category            VARCHAR(50)    NOT NULL,
    status              VARCHAR(30)    NOT NULL DEFAULT 'ACTIVE',
    serial_number       VARCHAR(100),
    description         TEXT,
    purchase_date       DATE           NOT NULL,
    purchase_cost       NUMERIC(19, 4) NOT NULL,
    gl_account_code     VARCHAR(10)    NOT NULL,
    journal_reference   VARCHAR(100)   UNIQUE,
    location            VARCHAR(200),
    supplier            VARCHAR(200),
    warranty_expiry     DATE,
    disposed_at         TIMESTAMP WITH TIME ZONE,
    disposal_notes      TEXT,
    created_by_user_id  UUID           NOT NULL REFERENCES users (id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT chk_asset_status   CHECK (status   IN ('ACTIVE', 'UNDER_MAINTENANCE', 'DISPOSED', 'WRITTEN_OFF')),
    CONSTRAINT chk_asset_category CHECK (category IN ('FURNITURE', 'EQUIPMENT', 'COMPUTER', 'VEHICLE', 'OTHER')),
    CONSTRAINT chk_asset_cost     CHECK (purchase_cost > 0)
);

CREATE INDEX idx_assets_status    ON sacco_assets (status);
CREATE INDEX idx_assets_category  ON sacco_assets (category);
CREATE INDEX idx_assets_created   ON sacco_assets (created_at DESC);
