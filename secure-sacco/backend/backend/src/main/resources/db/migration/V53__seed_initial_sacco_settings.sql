-- Seed initial SACCO settings if not already initialized
INSERT INTO sacco_settings (id, sacco_name, member_number_prefix, member_number_pad_length, registration_fee, logo_url, favicon_url, enabled_modules, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'Betterlink Ventures Limited',
    'BVL',
    6,
    1000.00,
    '',
    '',
    '{"members": true, "loans": false, "savings": false, "reports": false}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM sacco_settings);

