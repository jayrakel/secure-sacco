-- MEM-03-BE-02: Fix member status column default to reflect correct lifecycle.
-- Members must start as PENDING until they activate their account and pay the registration fee.
ALTER TABLE members
    ALTER COLUMN status SET DEFAULT 'PENDING';

