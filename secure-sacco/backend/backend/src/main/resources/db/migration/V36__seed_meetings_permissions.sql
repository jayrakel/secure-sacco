INSERT INTO permissions (code, description)
VALUES
    ('MEETINGS_READ',     'Can view meetings and attendance records'),
    ('MEETINGS_MANAGE',   'Can create, edit, cancel, and complete meetings'),
    ('ATTENDANCE_RECORD', 'Can record member attendance for a meeting')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'SECRETARY'
  AND p.code IN ('MEETINGS_READ', 'MEETINGS_MANAGE', 'ATTENDANCE_RECORD')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'CHAIRPERSON'
  AND p.code IN ('MEETINGS_READ', 'ATTENDANCE_RECORD')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('TREASURER', 'MEMBER')
  AND p.code = 'MEETINGS_READ'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'SYSTEM_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;