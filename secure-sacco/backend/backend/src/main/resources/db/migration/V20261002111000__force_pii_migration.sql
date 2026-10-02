-- Force PiiMigrationRunner to re-hash all existing members and users phone numbers
-- This is necessary to normalize phone numbers (e.g. +254 format) across the database.
-- Setting the hash to NULL triggers the startup runner to decrypt, normalize, re-encrypt, and re-hash.
UPDATE users SET phone_number_hash = NULL WHERE phone_number IS NOT NULL;
UPDATE members SET phone_number_hash = NULL WHERE phone_number IS NOT NULL;
