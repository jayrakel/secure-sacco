-- Move profile_image_url from members to users table
ALTER TABLE users ADD COLUMN profile_image_url TEXT;

-- Migrate existing data if any (matching by user_id)
UPDATE users u
SET profile_image_url = m.profile_image_url
FROM members m
WHERE m.user_id = u.id AND m.profile_image_url IS NOT NULL;

-- Remove the column from members
ALTER TABLE members DROP COLUMN profile_image_url;
