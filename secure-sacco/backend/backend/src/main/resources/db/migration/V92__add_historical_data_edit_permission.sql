-- =============================================================================
-- V92: Temporary historical data edit permission (SAC-269)
--
-- TEMPORARY BY DESIGN — this permission, and the entire isolated module it
-- gates (com.jaytechwave.sacco.modules.admin.historicaledit), exist only for
-- the client's testing/verification window. Once historical data is fully
-- verified and the system goes live for real, this permission row should be
-- deleted and the whole historicaledit package removed from the codebase —
-- there should be no way to silently rewrite ledger history in production.
--
-- Deliberately NOT auto-granted to any role here (unlike most permission
-- migrations in this codebase) — assign it manually, to exactly the people
-- who need it, for exactly as long as they need it.
-- =============================================================================

INSERT INTO permissions (code, description)
VALUES ('HISTORICAL_DATA_EDIT', 'TEMPORARY: can edit historical transaction records during data migration verification. Remove this permission and its module before go-live.')
ON CONFLICT (code) DO NOTHING;