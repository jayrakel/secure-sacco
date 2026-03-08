package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.core.security.EncryptedStringConverter;
import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * One-time data migration runner that encrypts plaintext PII columns and
 * backfills the corresponding HMAC search-hash columns for existing rows.
 *
 * <h3>Why JDBC instead of JPA?</h3>
 * The JPA entities now carry {@code @Convert(EncryptedStringConverter)} on the
 * PII columns.  Loading rows that still contain <em>plaintext</em> values through
 * JPA would cause the converter's {@code convertToEntityAttribute()} to fail
 * immediately (no IV separator found).  Raw JDBC reads the column bytes directly,
 * letting us detect and handle the plaintext-vs-encrypted distinction safely.
 *
 * <h3>Idempotency</h3>
 * Only rows where {@code national_id_hash IS NULL} (members) or
 * {@code phone_number_hash IS NULL} (users) are processed, so the runner is safe
 * to re-run after a partial failure.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PiiMigrationRunner {

    private final JdbcTemplate jdbc;
    private final EncryptedStringConverter encryptedStringConverter;
    private final PiiSearchHashConverter piiSearchHashConverter;

    /** Format stored by {@link EncryptedStringConverter}: {@code Base64(iv):Base64(ciphertext)} */
    private static boolean isAlreadyEncrypted(String value) {
        if (value == null) return false;
        // A valid ciphertext always contains exactly one ':' separating the IV from the body.
        // Plaintext national IDs / phone numbers never contain ':' in practice, but even if
        // they did, the Base64 segments must be ≥ 16 chars each — so a short prefix means plaintext.
        int idx = value.indexOf(':');
        return idx > 10 && idx < value.length() - 10;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfillPiiHashes() {
        backfillMemberHashes();
        backfillUserHashes();
    }

    // ── members ───────────────────────────────────────────────────────────────

    private void backfillMemberHashes() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, national_id, phone_number FROM members WHERE national_id_hash IS NULL");

        if (rows.isEmpty()) {
            log.debug("PiiMigrationRunner: no member rows require PII migration.");
            return;
        }

        log.info("PiiMigrationRunner: migrating PII for {} member(s).", rows.size());
        int count = 0;

        for (Map<String, Object> row : rows) {
            String id          = row.get("id").toString();
            String nationalId  = (String) row.get("national_id");
            String phoneNumber = (String) row.get("phone_number");

            // Resolve plaintext: if the value is already encrypted, decrypt it first.
            String plainNationalId  = resolvePlaintext(nationalId,  "national_id",  id);
            String plainPhoneNumber = resolvePlaintext(phoneNumber, "phone_number", id);

            // Encrypt (converter will produce a fresh IV:ciphertext string)
            String encNationalId  = encryptedStringConverter.convertToDatabaseColumn(plainNationalId);
            String encPhoneNumber = encryptedStringConverter.convertToDatabaseColumn(plainPhoneNumber);

            // Compute HMAC hashes
            String hashNationalId  = piiSearchHashConverter.convertToDatabaseColumn(plainNationalId);
            String hashPhoneNumber = piiSearchHashConverter.convertToDatabaseColumn(plainPhoneNumber);

            jdbc.update(
                    "UPDATE members SET national_id = ?, national_id_hash = ?, phone_number = ?, phone_number_hash = ? WHERE id = ?::uuid",
                    encNationalId, hashNationalId, encPhoneNumber, hashPhoneNumber, id);
            count++;
        }

        log.info("PiiMigrationRunner: member PII migration complete ({} rows updated).", count);
    }

    // ── users ─────────────────────────────────────────────────────────────────

    private void backfillUserHashes() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, phone_number FROM users WHERE phone_number_hash IS NULL AND phone_number IS NOT NULL");

        if (rows.isEmpty()) {
            log.debug("PiiMigrationRunner: no user rows require PII migration.");
            return;
        }

        log.info("PiiMigrationRunner: migrating PII for {} user(s).", rows.size());
        int count = 0;

        for (Map<String, Object> row : rows) {
            String id          = row.get("id").toString();
            String phoneNumber = (String) row.get("phone_number");

            String plainPhone    = resolvePlaintext(phoneNumber, "phone_number", id);
            String encPhone      = encryptedStringConverter.convertToDatabaseColumn(plainPhone);
            String hashPhone     = piiSearchHashConverter.convertToDatabaseColumn(plainPhone);

            jdbc.update(
                    "UPDATE users SET phone_number = ?, phone_number_hash = ? WHERE id = ?::uuid",
                    encPhone, hashPhone, id);
            count++;
        }

        log.info("PiiMigrationRunner: user PII migration complete ({} rows updated).", count);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /**
     * Returns the plaintext value.
     * <ul>
     *   <li>If {@code raw} looks like a plaintext value, returns it as-is.</li>
     *   <li>If {@code raw} is already in the encrypted {@code IV:ciphertext} format
     *       (e.g. a previous partial run), decrypts it first so we re-encrypt with
     *       a fresh IV and still produce the correct hash.</li>
     *   <li>If {@code raw} is {@code null}, returns {@code null}.</li>
     * </ul>
     */
    private String resolvePlaintext(String raw, String column, String id) {
        if (raw == null) return null;
        if (isAlreadyEncrypted(raw)) {
            log.debug("PiiMigrationRunner: row {} column {} is already encrypted — decrypting for re-hash.", id, column);
            return encryptedStringConverter.convertToEntityAttribute(raw);
        }
        return raw;
    }
}
