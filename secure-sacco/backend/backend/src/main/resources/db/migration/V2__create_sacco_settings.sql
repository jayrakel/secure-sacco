CREATE TABLE sacco_settings (
                                id UUID PRIMARY KEY,
                                sacco_name VARCHAR(255) NOT NULL,
                                member_number_prefix VARCHAR(3) NOT NULL,  -- <-- Changed to VARCHAR(3)
                                member_number_pad_length INT NOT NULL DEFAULT 7,
                                enabled_modules JSONB NOT NULL,
                                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX enforce_single_sacco_setting ON sacco_settings ((1));