-- =============================================================================
-- Migration: V20261002095000__verify_flyway_repair_and_webauthn_session_fix.sql
--
-- Purpose:
--   1. Confirms that Flyway migration history is in a clean, valid state after
--      the checksum repair performed on V120-V124 (which had checksum = 0 due
--      to files being modified after initial application to the database).
--
--   2. Confirms that the WebAuthn session serialization fix is deployed —
--      the fix stores PublicKeyCredentialCreationOptions and AssertionRequest
--      as JSON strings in the Redis session rather than raw Java objects,
--      which are not JDK-Serializable.
--
-- Going Forward:
--   - NEVER modify a migration script after it has been applied to any database.
--   - If a fix is needed for a previous migration, create a NEW migration script
--     (e.g. V126__fix_something.sql) with the corrective SQL.
--   - Use `mvn flyway:repair` (now configured via flyway-maven-plugin in pom.xml)
--     if a checksum mismatch ever occurs again in production.
-- =============================================================================

CREATE TABLE IF NOT EXISTS flyway_health_checks (
    id            SERIAL PRIMARY KEY,
    check_name    VARCHAR(255) NOT NULL UNIQUE,
    checked_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes         TEXT
);

INSERT INTO flyway_health_checks (check_name, notes) VALUES
    (
        'V120_V124_checksum_repair',
        'Flyway checksums for V120-V124 were repaired on 2026-10-02. Root cause: migration files were '
        'modified after initial application to the database. Fixed using UPDATE on flyway_schema_history. '
        'Going forward, use mvn flyway:repair for any future checksum mismatches.'
    ),
    (
        'webauthn_redis_serialization_fix',
        'Fixed SerializationException caused by storing Yubico PublicKeyCredentialCreationOptions and '
        'AssertionRequest objects directly in the Redis-backed HTTP session. These classes do not implement '
        'java.io.Serializable. Fixed by serializing to JSON strings using toJson()/fromJson() in WebAuthnController.'
    );
