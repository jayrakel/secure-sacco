package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * One-time data migration runner that backfills PII hash columns for existing rows.
 *
 * <h3>When does it run?</h3>
 * Automatically on startup, immediately after the application is fully initialised
 * ({@link ApplicationReadyEvent}).  It is a no-op once all rows have been
 * backfilled (i.e. {@code national_id_hash IS NOT NULL} for every member).
 *
 * <h3>Pre-conditions</h3>
 * <ul>
 *   <li>Flyway migration V40 must have already been applied so the hash columns
 *       exist in the database.</li>
 *   <li>{@code APP_FIELD_ENCRYPTION_KEY} and {@code APP_PII_HMAC_KEY} environment
 *       variables must be set so the converters can initialise.</li>
 * </ul>
 *
 * <h3>Safety</h3>
 * The runner only touches rows where {@code national_id_hash IS NULL} (members) or
 * {@code phone_number_hash IS NULL} (users), so it is idempotent and safe to
 * restart multiple times.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PiiMigrationRunner {

    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final PiiSearchHashConverter piiSearchHashConverter;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfillPiiHashes() {
        backfillMemberHashes();
        backfillUserHashes();
    }

    private void backfillMemberHashes() {
        List<Member> pending = memberRepository.findAll()
                .stream()
                .filter(m -> m.getNationalIdHash() == null)
                .toList();

        if (pending.isEmpty()) {
            log.debug("PiiMigrationRunner: no member rows require PII hash backfill.");
            return;
        }

        log.info("PiiMigrationRunner: backfilling PII hashes for {} member(s).", pending.size());

        for (Member member : pending) {
            // At this point data is still plaintext (pre-encryption migration).
            // EncryptedStringConverter.convertToDatabaseColumn() will encrypt on save;
            // we only need to set the hash fields explicitly here.
            if (member.getNationalId() != null) {
                member.setNationalIdHash(
                        piiSearchHashConverter.convertToDatabaseColumn(member.getNationalId()));
            }
            if (member.getPhoneNumber() != null) {
                member.setPhoneNumberHash(
                        piiSearchHashConverter.convertToDatabaseColumn(member.getPhoneNumber()));
            }
            memberRepository.save(member);
        }

        log.info("PiiMigrationRunner: member PII hash backfill complete ({} rows updated).", pending.size());
    }

    private void backfillUserHashes() {
        List<User> pending = userRepository.findAll()
                .stream()
                .filter(u -> u.getPhoneNumberHash() == null && u.getPhoneNumber() != null)
                .toList();

        if (pending.isEmpty()) {
            log.debug("PiiMigrationRunner: no user rows require PII hash backfill.");
            return;
        }

        log.info("PiiMigrationRunner: backfilling PII hashes for {} user(s).", pending.size());

        for (User user : pending) {
            user.setPhoneNumberHash(
                    piiSearchHashConverter.convertToDatabaseColumn(user.getPhoneNumber()));
            userRepository.save(user);
        }

        log.info("PiiMigrationRunner: user PII hash backfill complete ({} rows updated).", pending.size());
    }
}

