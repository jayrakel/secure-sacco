-- Add branding URL columns to the sacco_settings table
ALTER TABLE sacco_settings
    ADD COLUMN logo_url VARCHAR(1024),
    ADD COLUMN favicon_url VARCHAR(1024);