CREATE TABLE sacco_expenses (
    id UUID PRIMARY KEY,
    expense_date DATE NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    gl_account_code VARCHAR(10) NOT NULL,
    narration TEXT,
    reference VARCHAR(100),
    journal_reference VARCHAR(100) UNIQUE,
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
