ALTER TABLE penalties ADD COLUMN IF NOT EXISTS amount_waived DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

INSERT INTO permissions (id, code, description) VALUES
    ('f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'PENALTIES_WAIVE_ADJUST', 'Can waive or adjust penalties')
ON CONFLICT (code) DO NOTHING;