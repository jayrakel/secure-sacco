-- Add reference_notes column to loan_applications for storing reference notes on loans
ALTER TABLE loan_applications ADD COLUMN reference_notes TEXT;
