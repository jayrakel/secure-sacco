-- ==============================================================================
-- EXHAUSTIVE KENYAN BANKS SEEDER (CBK Regulated Commercial Banks)
-- Creates a lookup table for member withdrawals, EFTs, RTGS, and Pesalink
-- ==============================================================================

-- 1. Create the lookup table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS banks (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     bank_code VARCHAR(10) UNIQUE NOT NULL,
                                     bank_name VARCHAR(100) NOT NULL,
                                     is_active BOOLEAN DEFAULT TRUE,
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Exhaustive Insert of all CBK Banks (Using standard CBK Routing Codes)
INSERT INTO banks (id, bank_code, bank_name) VALUES
                                                 (gen_random_uuid(), '01', 'Kenya Commercial Bank (KCB)'),
                                                 (gen_random_uuid(), '02', 'Standard Chartered Bank'),
                                                 (gen_random_uuid(), '03', 'Absa Bank Kenya (formerly Barclays)'),
                                                 (gen_random_uuid(), '04', 'Bank of India'),
                                                 (gen_random_uuid(), '05', 'Bank of Baroda'),
                                                 (gen_random_uuid(), '07', 'NCBA Bank Kenya'),
                                                 (gen_random_uuid(), '09', 'I&M Bank'),
                                                 (gen_random_uuid(), '10', 'Prime Bank'),
                                                 (gen_random_uuid(), '11', 'Co-operative Bank of Kenya'),
                                                 (gen_random_uuid(), '12', 'National Bank of Kenya (NBK)'),
                                                 (gen_random_uuid(), '14', 'Oriental Commercial Bank'),
                                                 (gen_random_uuid(), '15', 'Citibank N.A Kenya'),
                                                 (gen_random_uuid(), '16', 'Victoria Commercial Bank'),
                                                 (gen_random_uuid(), '17', 'Habib Bank A.G Zurich'),
                                                 (gen_random_uuid(), '18', 'Middle East Bank Kenya'),
                                                 (gen_random_uuid(), '19', 'Bank of Africa Kenya'),
                                                 (gen_random_uuid(), '23', 'Consolidated Bank of Kenya'),
                                                 (gen_random_uuid(), '25', 'Credit Bank'),
                                                 (gen_random_uuid(), '26', 'Access Bank Kenya (formerly Transnational)'),
                                                 (gen_random_uuid(), '31', 'Stanbic Bank Kenya'),
                                                 (gen_random_uuid(), '35', 'African Banking Corporation (ABC Bank)'),
                                                 (gen_random_uuid(), '39', 'Ecobank Kenya'),
                                                 (gen_random_uuid(), '41', 'Spire Bank (formerly Equatorial)'),
                                                 (gen_random_uuid(), '42', 'Paramount Bank'),
                                                 (gen_random_uuid(), '43', 'Kingdom Bank (formerly Jamii Bora)'),
                                                 (gen_random_uuid(), '50', 'Premier Bank Kenya (formerly First Community)'),
                                                 (gen_random_uuid(), '51', 'Development Bank of Kenya'),
                                                 (gen_random_uuid(), '53', 'Guaranty Trust Bank (GTBank)'),
                                                 (gen_random_uuid(), '55', 'SBM Bank Kenya (formerly Chase/Fidelity)'),
                                                 (gen_random_uuid(), '57', 'UBA Kenya Bank'),
                                                 (gen_random_uuid(), '59', 'Gulf African Bank'),
                                                 (gen_random_uuid(), '63', 'Diamond Trust Bank (DTB)'),
                                                 (gen_random_uuid(), '66', 'Sidian Bank (formerly K-Rep)'),
                                                 (gen_random_uuid(), '68', 'Equity Bank Kenya'),
                                                 (gen_random_uuid(), '70', 'Family Bank'),
                                                 (gen_random_uuid(), '74', 'DIB Bank Kenya (Dubai Islamic)'),
                                                 (gen_random_uuid(), '76', 'Mayfair CIB Bank')
ON CONFLICT (bank_code) DO NOTHING;