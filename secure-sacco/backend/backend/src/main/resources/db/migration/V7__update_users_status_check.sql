-- Drop the old restrictive check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_status;

-- Add it back with the new PENDING_ACTIVATION status included
ALTER TABLE users ADD CONSTRAINT chk_users_status
    CHECK (user_status IN ('ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING_ACTIVATION'));