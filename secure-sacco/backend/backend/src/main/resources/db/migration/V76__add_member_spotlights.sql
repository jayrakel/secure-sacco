-- SAC-232: Secretary-managed member spotlights for the public landing page
-- Uses users table (all members are users; not all users are members)

-- Add user_id to existing table (created by V75 without this column)
ALTER TABLE public_member_spotlights
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_spotlights_published
    ON public_member_spotlights(is_published, display_order ASC);