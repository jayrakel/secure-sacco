package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.core.dto.HistoricalMemberRequest;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.CreateMemberRequest;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.MemberResponse;
import com.jaytechwave.sacco.modules.members.domain.entity.Gender;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;

/**
 * Migrates historical members from legacy records into the SACCO platform.
 *
 * <h3>Key design rule</h3>
 * {@code MemberService.createMember()} always creates its own {@code User} internally.
 * MigrationService must NEVER call {@code UserService.createUser()} first — doing so would
 * create a duplicate User with the same email, causing a DB unique-constraint violation that
 * silently rolls back the entire transaction and persists nothing.
 *
 * <h3>Migration flow</h3>
 * <ol>
 *   <li>Call {@code memberService.createMember()} → creates Member + User (PENDING_ACTIVATION)</li>
 *   <li>Retrieve the newly created User by email</li>
 *   <li>Override the random placeholder password with the provided plaintext password</li>
 *   <li>Set User status to ACTIVE (historical members are already active)</li>
 *   <li>Back-date {@code created_at} / {@code joined_date} via raw JDBC to preserve history</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MigrationService {

    private final com.jaytechwave.sacco.modules.members.domain.service.MemberService memberService;
    private final UserRepository    userRepository;
    private final MemberRepository  memberRepository;
    private final PasswordEncoder   passwordEncoder;
    private final JdbcTemplate      jdbcTemplate;

    @Transactional
    public String seedHistoricalMember(HistoricalMemberRequest request) {
        log.info("🕰️  Migrating historical member: {} {} (Date: {})",
                request.firstName(), request.lastName(), request.registrationDate());

        // ── Step 1: create Member + its portal User via the standard service ──────
        // createMember always creates its OWN User internally — do NOT call
        // userService.createUser() before this; that causes a duplicate-email
        // constraint violation which silently rolls back the whole transaction.
        CreateMemberRequest memberReq = new CreateMemberRequest();
        memberReq.setFirstName(request.firstName());
        memberReq.setLastName(request.lastName());
        memberReq.setEmail(request.email());
        memberReq.setPhoneNumber(request.phoneNumber());
        memberReq.setNationalId("MIGRATE-" + System.currentTimeMillis());
        memberReq.setDateOfBirth(request.registrationDate().minusYears(30));
        memberReq.setGender(Gender.MALE);

        MemberResponse memberResponse = memberService.createMember(memberReq);

        // ── Step 2: fetch the User that createMember just created ─────────────────
        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new IllegalStateException(
                        "User not found after member creation — email: " + request.email()));

        // ── Step 3: set real password + mark ACTIVE ───────────────────────────────
        // createMember sets a random UUID hash as the password and status=PENDING_ACTIVATION.
        // For a migration we override both so the member can log in immediately.
        user.setPasswordHash(passwordEncoder.encode(request.plainTextPassword()));
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        user.setMustChangePassword(false);
        userRepository.save(user);

        // ── Step 4: back-date created_at / joined_date via raw JDBC ──────────────
        Timestamp historicalTs = Timestamp.valueOf(request.registrationDate().atStartOfDay());

        jdbcTemplate.update("UPDATE users   SET created_at = ? WHERE id = ?",
                historicalTs, user.getId());
        jdbcTemplate.update("UPDATE members SET joined_date = ?, created_at = ? WHERE id = ?",
                request.registrationDate(), historicalTs, memberResponse.getId());

        log.info("✅ Migrated member {} — number: {}", request.email(), memberResponse.getMemberNumber());

        return memberResponse.getMemberNumber();
    }
}