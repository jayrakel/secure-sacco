-- Diagnostic queries to check SACCO settings state on staging

-- 1. Check if settings table exists and has records
SELECT 'SETTINGS TABLE STATUS:' AS check_type;
SELECT COUNT(*) as record_count FROM sacco_settings;

-- 2. Show all columns and their values
SELECT
    id,
    sacco_name,
    member_number_prefix,
    member_number_pad_length,
    registration_fee,
    logo_url,
    favicon_url,
    enabled_modules,
    created_at,
    updated_at
FROM sacco_settings;

-- 3. Check schema of sacco_settings table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sacco_settings'
ORDER BY ordinal_position;

-- 4. Check for any NULL values that might cause issues
SELECT
    'NULL CHECK:' AS check_type,
    CASE WHEN sacco_name IS NULL THEN 'sacco_name IS NULL' ELSE 'OK' END,
    CASE WHEN member_number_prefix IS NULL THEN 'prefix IS NULL' ELSE 'OK' END,
    CASE WHEN member_number_pad_length IS NULL THEN 'padLength IS NULL' ELSE 'OK' END,
    CASE WHEN enabled_modules IS NULL THEN 'modules IS NULL' ELSE 'OK' END
FROM sacco_settings;

-- 5. Check Flyway migration history to see what was applied
SELECT
    'MIGRATION HISTORY:' AS check_type,
    version,
    description,
    type,
    installed_by,
    installed_on,
    execution_time,
    success
FROM flyway_schema_history
WHERE script LIKE '%sacco%' OR script LIKE '%settings%'
ORDER BY installed_on DESC;

