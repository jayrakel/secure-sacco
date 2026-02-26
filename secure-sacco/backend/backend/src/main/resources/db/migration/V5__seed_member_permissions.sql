-- Insert the new Member permissions
INSERT INTO permissions (code, description) VALUES
                                                           ('MEMBERS_READ', 'View members list and details'),
                                                           ('MEMBERS_WRITE', 'Create, update, and delete members')
ON CONFLICT (code) DO NOTHING;

-- Grant these permissions to the SYSTEM_ADMIN role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'SYSTEM_ADMIN'
  AND p.code IN ('MEMBERS_READ', 'MEMBERS_WRITE')
ON CONFLICT DO NOTHING;