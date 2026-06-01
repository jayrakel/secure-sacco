-- SAC-229: Public landing page content tables

-- ── 1. Extend sacco_settings with public profile fields ────────────────────
ALTER TABLE sacco_settings
    ADD COLUMN IF NOT EXISTS sacco_tagline        TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS sacco_history         TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS sacco_mission         TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS sacco_vision          TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS founded_year          INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS contact_phone         VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contact_email         VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contact_address       TEXT NOT NULL DEFAULT '';

-- ── 2. Public announcements ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public_announcements (
                                                    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    is_published    BOOLEAN NOT NULL DEFAULT TRUE,
    published_by    UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_announcements_published
    ON public_announcements(is_published, created_at DESC);

-- ── 3. Public documents ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public_documents (
                                                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    category        VARCHAR(50) NOT NULL DEFAULT 'OTHER',
    file_url        TEXT NOT NULL,
    file_name       VARCHAR(255) NOT NULL DEFAULT '',
    meeting_date    DATE DEFAULT NULL,
    is_published    BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_documents_published
    ON public_documents(is_published, category, created_at DESC);