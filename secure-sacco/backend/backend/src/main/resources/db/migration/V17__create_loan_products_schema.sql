CREATE TABLE loan_products (
                               id UUID PRIMARY KEY,
                               name VARCHAR(255) NOT NULL UNIQUE,
                               description TEXT,
                               repayment_frequency VARCHAR(50) NOT NULL,
                               term_weeks INTEGER NOT NULL,
                               interest_model VARCHAR(50) NOT NULL,
                               interest_rate DECIMAL(5,2) NOT NULL,
                               application_fee DECIMAL(10,2) NOT NULL,
                               grace_period_days INTEGER NOT NULL,
                               is_active BOOLEAN NOT NULL DEFAULT TRUE,
                               created_at TIMESTAMP NOT NULL,
                               updated_at TIMESTAMP
);