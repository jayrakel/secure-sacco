-- 1. Turn off the old generic 'MEETING_LATE' rule so the system strictly uses the new Tiers
UPDATE penalty_rules
SET is_active = false,
    description = 'DEPRECATED: Replaced by tiered lateness rules (MEETING_LATE_30, MEETING_LATE_120).'
WHERE code = 'MEETING_LATE';

-- 2. Safely Insert Tier 1: Late Under 2 Hours (200 KES)
INSERT INTO penalty_rules (
    id, code, name, description, base_amount_type, base_amount_value,
    interest_mode, interest_rate, grace_period_days, interest_period_days, is_active, created_at, updated_at
)
SELECT
    gen_random_uuid(), 'MEETING_LATE_30', 'Late to Meeting (Under 2 hours)',
    'Applied when a member is late, but arrives within 2 hours of the start time.',
    'FIXED', 200.00, 'NONE', 0.00, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM penalty_rules WHERE code = 'MEETING_LATE_30');

-- 3. Safely Insert Tier 2: Late Over 2 Hours (500 KES)
INSERT INTO penalty_rules (
    id, code, name, description, base_amount_type, base_amount_value,
    interest_mode, interest_rate, grace_period_days, interest_period_days, is_active, created_at, updated_at
)
SELECT
    gen_random_uuid(), 'MEETING_LATE_120', 'Late to Meeting (Over 2 hours)',
    'Applied when a member arrives more than 2 hours after the start time.',
    'FIXED', 500.00, 'NONE', 0.00, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM penalty_rules WHERE code = 'MEETING_LATE_120');

-- 4. Safely Insert Savings Default (500 KES)
INSERT INTO penalty_rules (
    id, code, name, description, base_amount_type, base_amount_value,
    interest_mode, interest_rate, grace_period_days, interest_period_days, is_active, created_at, updated_at
)
SELECT
    gen_random_uuid(), 'SAVINGS_DEFAULT', 'Missed Savings Contribution',
    'Applied when a member fails to make their mandatory savings deposit within their 1-day grace period.',
    'FIXED', 500.00, 'NONE', 0.00, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM penalty_rules WHERE code = 'SAVINGS_DEFAULT');

-- 5. Force update the amounts just in case the rules already existed with old figures
UPDATE penalty_rules SET base_amount_value = 200.00, is_active = true WHERE code = 'MEETING_LATE_30';
UPDATE penalty_rules SET base_amount_value = 500.00, is_active = true WHERE code = 'MEETING_LATE_120';
UPDATE penalty_rules SET base_amount_value = 500.00, is_active = true WHERE code = 'SAVINGS_DEFAULT';

-- Also ensure the Absent penalty is correctly set to 1000 KES
UPDATE penalty_rules SET base_amount_value = 1000.00, is_active = true WHERE code = 'MEETING_ABSENT';