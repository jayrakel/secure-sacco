-- Add verification tracking to users
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Create table for OTPs and Email Links
CREATE TABLE verification_tokens (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                     token VARCHAR(255) NOT NULL,
                                     token_type VARCHAR(50) NOT NULL,
                                     expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
                                     is_used BOOLEAN NOT NULL DEFAULT FALSE,
                                     attempts INT NOT NULL DEFAULT 0,
                                     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);