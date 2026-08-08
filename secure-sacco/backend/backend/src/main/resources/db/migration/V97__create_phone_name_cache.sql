CREATE TABLE phone_name_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(255) NOT NULL UNIQUE,
    sender_name VARCHAR(255),
    confidence INTEGER NOT NULL DEFAULT 1,
    last_seen_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_phone_name_cache_phone ON phone_name_cache(phone_number);
