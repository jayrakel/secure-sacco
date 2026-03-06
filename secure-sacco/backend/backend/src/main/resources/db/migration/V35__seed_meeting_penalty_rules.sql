INSERT INTO penalty_rules (
    id, code, name, description,
    base_amount_type, base_amount_value,
    grace_period_days, interest_period_days,
    interest_rate, interest_mode,
    is_active, created_at, updated_at
)
VALUES
    (
        gen_random_uuid(),
        'MEETING_LATE',
        'Late Attendance Penalty',
        'Penalty applied to members who arrive late to a SACCO meeting',
        'FIXED', 100.00,
        0, 30,
        0.00, 'NONE',
        true, now(), now()
    ),
    (
        gen_random_uuid(),
        'MEETING_ABSENT',
        'Absenteeism Penalty',
        'Penalty applied to members who are absent from a SACCO meeting',
        'FIXED', 200.00,
        0, 30,
        0.00, 'NONE',
        true, now(), now()
    )
ON CONFLICT (code) DO NOTHING;