-- Add the reverse link from User to Member
ALTER TABLE users ADD COLUMN member_id UUID UNIQUE REFERENCES members(id) ON DELETE SET NULL;

-- Create the default Member role
INSERT INTO roles (name, description) VALUES ('MEMBER', 'Default role for SACCO members accessing the portal') ON CONFLICT (name) DO NOTHING;