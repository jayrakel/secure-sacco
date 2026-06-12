-- =============================================================================
-- V87: Add unique constraint to journal_entries.reference_number
--
-- ROOT CAUSE of duplicate GL entries in backfill:
-- The backfill INSERT used ON CONFLICT (reference_number) DO NOTHING but
-- journal_entries had no unique constraint on reference_number, so PostgreSQL
-- could not use it. Both the IPN and mini-statement coop_transaction records
-- each created their own GL entry for the same reference, doubling suspense.
--
-- This constraint ensures that no two journal entries can ever share the same
-- reference number going forward. All existing postSavingsTransaction,
-- postPenaltyCreation, postNonMemberBankCredit, postAccountDebit methods
-- already check for existing entries via findByReferenceNumber before inserting,
-- so this constraint will never fire in normal operation — it's a safety net.
-- =============================================================================

ALTER TABLE journal_entries
    ADD CONSTRAINT uq_journal_entries_reference_number UNIQUE (reference_number);