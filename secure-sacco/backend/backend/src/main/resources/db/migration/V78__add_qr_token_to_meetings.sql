-- Add QR token to meetings for self check-in via phone scan
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64) UNIQUE;

-- Generate unique tokens for all existing meetings
UPDATE meetings SET qr_token = encode(gen_random_bytes(32), 'hex') WHERE qr_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_qr_token ON meetings(qr_token);