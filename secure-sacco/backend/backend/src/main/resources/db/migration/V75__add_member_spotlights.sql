-- SAC-232: Secretary-managed member spotlights for the public landing page

CREATE TABLE IF NOT EXISTS public_member_spotlights (
                                                        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name    VARCHAR(255) NOT NULL,
    role_title      VARCHAR(255) NOT NULL DEFAULT '',
    photo_url       TEXT NOT NULL,              -- Cloudinary URL or any public image URL
    display_order   INTEGER NOT NULL DEFAULT 0, -- Controls carousel order
    is_published    BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_spotlights_published
    ON public_member_spotlights(is_published, display_order ASC);