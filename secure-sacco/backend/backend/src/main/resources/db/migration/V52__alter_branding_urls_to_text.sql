-- Alter existing branding columns to support large Base64 strings
ALTER TABLE sacco_settings
    ALTER COLUMN logo_url TYPE TEXT,
    ALTER COLUMN favicon_url TYPE TEXT;