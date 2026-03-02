-- Add the registration_fee column with a default of 1000 KES
ALTER TABLE sacco_settings
    ADD COLUMN registration_fee DECIMAL(15, 2) NOT NULL DEFAULT 1000.00;