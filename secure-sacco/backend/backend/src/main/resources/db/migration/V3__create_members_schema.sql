-- Create updated_at trigger function if it doesn't already exist from previous migrations
CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Members Table
CREATE TABLE members (
                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                         user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Links to an optional login account
                         member_number VARCHAR(30) UNIQUE NOT NULL,
                         first_name VARCHAR(80) NOT NULL,
                         middle_name VARCHAR(80),
                         last_name VARCHAR(80) NOT NULL,
                         national_id VARCHAR(50) UNIQUE,
                         phone_number VARCHAR(30),
                         email VARCHAR(120),
                         date_of_birth DATE,
                         gender VARCHAR(20),
                         status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                         is_deleted BOOLEAN NOT NULL DEFAULT false,
                         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                         updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX idx_members_member_number ON members(member_number);
CREATE INDEX idx_members_phone_number ON members(phone_number);
CREATE INDEX idx_members_national_id ON members(national_id);
CREATE INDEX idx_members_user_id ON members(user_id);

-- Attach trigger for automatic updated_at handling
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();