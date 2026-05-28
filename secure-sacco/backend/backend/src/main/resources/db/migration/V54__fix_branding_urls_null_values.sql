-- Fix NULL values and add DEFAULT constraint for branding URLs
-- This migration corrects issues from V51 where logo_url and favicon_url had NULL values

-- Set any existing NULLs to empty string
UPDATE sacco_settings SET
    logo_url = COALESCE(logo_url, ''),
    favicon_url = COALESCE(favicon_url, '')
WHERE logo_url IS NULL OR favicon_url IS NULL;

-- Add NOT NULL constraint to prevent future NULLs
ALTER TABLE sacco_settings
    ALTER COLUMN logo_url SET NOT NULL,
    ALTER COLUMN favicon_url SET NOT NULL;

-- Set default values for new inserts
ALTER TABLE sacco_settings
    ALTER COLUMN logo_url SET DEFAULT '',
    ALTER COLUMN favicon_url SET DEFAULT '';

