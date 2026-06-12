-- =============================================================================
-- V88: Standardise transaction references (SAC-242)
--
-- GOAL: One transaction, one reference, visible across:
--   • coop_transactions.mpesa_ref
--   • savings_transactions.reference
--   • journal_entries.reference_number
--   • Co-op bank statement
--   • Member's M-Pesa confirmation SMS
--
-- CHANGES:
-- 1. Strip SAV- prefix from journal_entries.reference_number
--    SAV-UF43M7BRHG → UF43M7BRHG
--    SAV-PTR-BEN-2025-11-20 → PTR-BEN-2025-11-20
--
-- 2. Update POSTED savings_transactions with DEP- references to the actual
--    M-Pesa ref from the payments table (joined via account_reference = DEP- ref).
--    DEP-C9300AC5 → UF43M7BRHG
--
-- SAFE: V87 added a unique constraint on journal_entries.reference_number.
-- The UPDATE below cannot create duplicates because each SAV-{ref} is unique
-- (enforced by V87) so each stripped {ref} is also unique.
-- =============================================================================

-- ── STEP 1: Strip SAV- prefix from GL entries ─────────────────────────────────
-- Affects savings deposits, savings withdrawals, any savings GL entry.
-- Does NOT touch PENC-, BANK-CR-, BANK-DR-, FEE-, LNDIS- entries.

UPDATE journal_entries
SET reference_number = SUBSTRING(reference_number FROM 5)  -- removes 'SAV-' (4 chars)
WHERE reference_number LIKE 'SAV-%';


-- ── STEP 2: Update POSTED DEP- savings references to actual M-Pesa refs ───────
-- Links savings_transactions (DEP-{uuid}) → payments (account_reference = DEP-{uuid})
-- → payments.mpesa_ref (the real M-Pesa receipt e.g. UF43M7BRHG).
-- Only updates where the M-Pesa ref is known and the savings tx is POSTED.

UPDATE savings_transactions st
SET reference = p.mpesa_ref
FROM payments p
WHERE p.account_reference = st.reference   -- DEP-C9300AC5 = DEP-C9300AC5
  AND st.reference LIKE 'DEP-%'
  AND st.status = 'POSTED'
  AND st.channel = 'MPESA'
  AND p.mpesa_ref IS NOT NULL
  AND p.mpesa_ref != '';


-- ── VERIFICATION ──────────────────────────────────────────────────────────────
-- Count remaining SAV- prefixed GL entries (should be 0)
SELECT COUNT(*) AS remaining_sav_prefix
FROM journal_entries
WHERE reference_number LIKE 'SAV-%';

-- Count remaining DEP- POSTED savings transactions (should be 0 or minimal)
SELECT COUNT(*) AS remaining_dep_posted
FROM savings_transactions
WHERE reference LIKE 'DEP-%'
  AND status = 'POSTED'
  AND channel = 'MPESA';