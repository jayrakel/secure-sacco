CREATE TABLE member_number_sequence (
                                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                        next_value BIGINT NOT NULL
);

-- Enforce singleton pattern (only one row can ever exist in this table)
CREATE UNIQUE INDEX enforce_single_member_sequence ON member_number_sequence ((1));

-- Insert the seed row starting at 1
INSERT INTO member_number_sequence (next_value) VALUES (1);