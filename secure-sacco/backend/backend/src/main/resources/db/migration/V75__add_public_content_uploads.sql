-- Migration to add support for community photos and member profile images
ALTER TABLE sacco_settings ADD COLUMN community_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE members ADD COLUMN profile_image_url TEXT;
