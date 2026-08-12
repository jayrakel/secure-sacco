CREATE TABLE IF NOT EXISTS dividend_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_year INT NOT NULL,
    rate_percentage DECIMAL(5, 2) NOT NULL,
    total_allocated DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dividend_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    declaration_id UUID NOT NULL REFERENCES dividend_declarations(id),
    member_id UUID NOT NULL REFERENCES members(id),
    gross_amount DECIMAL(15, 2) NOT NULL,
    arrears_deducted DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(15, 2) NOT NULL,
    payout_destination VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
