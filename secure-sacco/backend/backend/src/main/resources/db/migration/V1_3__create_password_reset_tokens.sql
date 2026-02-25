CREATE TABLE password_reset_tokens (
                                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                       user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                       token VARCHAR(255) NOT NULL UNIQUE,
                                       expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
                                       used BOOLEAN NOT NULL DEFAULT FALSE,
                                       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);