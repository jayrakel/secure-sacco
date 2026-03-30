-- Add the term_weeks column to loan_applications to allow dynamic loan lengths
ALTER TABLE loan_applications
    ADD COLUMN term_weeks INTEGER NOT NULL DEFAULT 104;