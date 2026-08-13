-- V108: Create financial_years table

CREATE TABLE IF NOT EXISTS financial_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_name VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_financial_years_status CHECK (status IN ('OPEN', 'CLOSED'))
);

-- Ensure only one year can be marked as 'current' at a time using a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_years_one_current 
ON financial_years (is_current) 
WHERE is_current = true;
