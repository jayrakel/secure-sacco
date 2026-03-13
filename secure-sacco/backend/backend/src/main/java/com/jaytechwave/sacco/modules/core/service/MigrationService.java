package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.core.dto.HistoricalMemberRequest;
import com.jaytechwave.sacco.modules.core.dto.HistoricalSavingsRequest;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.CreateMemberRequest;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.MemberResponse;
import com.jaytechwave.sacco.modules.members.domain.entity.Gender;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.savings.api.dto.SavingsDTOs;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccount;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccountStatus;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

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

    @PersistenceContext
    private EntityManager entityManager;
    private final com.jaytechwave.sacco.modules.members.domain.service.MemberService memberService;
    private final com.jaytechwave.sacco.modules.savings.domain.service.SavingsService savingsService;
    private final com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository savingsAccountRepository;
    private final com.jaytechwave.sacco.modules.accounting.domain.repository.JournalEntryRepository journalEntryRepository;
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

        // ── Step 3.5: Fix Member Number Year and Status ───────────────────────────
        // Fetch the actual Member entity so we can modify and save it
        Member member = memberRepository.findById(memberResponse.getId())
                .orElseThrow(() -> new IllegalStateException("Member not found"));

        String historicalYear = String.valueOf(request.registrationDate().getYear()); // e.g., "2022"
        String currentYear = String.valueOf(java.time.Year.now().getValue());         // e.g., "2026"
        String correctedMemberNumber = member.getMemberNumber().replace(currentYear, historicalYear);

        member.setMemberNumber(correctedMemberNumber);
        member.setStatus(MemberStatus.ACTIVE);
        memberRepository.save(member);

        // ── Step 4: back-date created_at / joined_date via raw JDBC ──────────────
        Timestamp historicalTs = Timestamp.valueOf(request.registrationDate().atStartOfDay());

        jdbcTemplate.update("UPDATE users   SET created_at = ? WHERE id = ?",
                historicalTs, user.getId());
        // ✅ Fixed — only back-date created_at, which is the actual column that exists
        jdbcTemplate.update("UPDATE members SET created_at = ? WHERE id = ?",
                historicalTs, memberResponse.getId());

        log.info("✅ Migrated member {} — number: {}", request.email(), memberResponse.getMemberNumber());

        return memberResponse.getMemberNumber();
    }

    @Transactional
    public String seedHistoricalSavings(HistoricalSavingsRequest request) {
        log.info("💰 Migrating historical savings for {} - Amount: {} (Date: {})",
                request.memberNumber(), request.amount(), request.transactionDate());

        // 1. Find the member's savings account
        Member member = memberRepository.findByMemberNumber(request.memberNumber())
                .orElseThrow(() -> new IllegalStateException("Member not found: " + request.memberNumber()));

        // 1. Find the member's savings account, or CREATE IT if it doesn't exist
        SavingsAccount account = savingsAccountRepository.findByMemberId(member.getId())
                .orElseGet(() -> {
                    log.info("Creating missing savings account for member: {}", member.getMemberNumber());
                    SavingsAccount newAccount =
                            new SavingsAccount();

                    newAccount.setMemberId(member.getId());
                    newAccount.setStatus(SavingsAccountStatus.ACTIVE);

                    return savingsAccountRepository.save(newAccount);
                });
        // 2. Build the manual deposit request
        SavingsDTOs.ManualDepositRequest depositReq =
                new SavingsDTOs.ManualDepositRequest(
                        member.getId(),
                        request.amount(),
                        request.referenceNumber()
                );

        // 3. Post the deposit using the real service
        SavingsDTOs.SavingsTransactionResponse response =
                savingsService.processManualDeposit(depositReq);

        // 3.5 FORCE HIBERNATE TO SAVE AND FORGET
        // This forces Hibernate to write "today's" data to the DB right now,
        // and then clears the cache so it doesn't overwrite our JDBC Time Machine at the end of the method!
        entityManager.flush();
        entityManager.clear();

        // 4. TIME MACHINE: Backdate the Savings Transaction and Accounting Entries
        java.time.LocalDate historicalDate = request.transactionDate();
        Timestamp historicalTs = Timestamp.valueOf(historicalDate.atStartOfDay());

        // Backdate the savings transaction (including updated_at so the UI sorts it properly)
        jdbcTemplate.update("UPDATE savings_transactions SET posted_at = ?, created_at = ?, updated_at = ? WHERE id = ?",
                historicalTs, historicalTs, historicalTs, response.transactionId());

        // Backdate the General Ledger Journal Entries (transaction_date is a DATE column, not a TIMESTAMP)
        jdbcTemplate.update("UPDATE journal_entries SET transaction_date = ?, created_at = ?, updated_at = ? WHERE reference_number = ?",
                historicalDate, historicalTs, historicalTs, response.reference());

        // Backdate the Journal Entry Lines
        jdbcTemplate.update("UPDATE journal_entry_lines SET created_at = ?, updated_at = ? WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference_number = ?)",
                historicalTs, historicalTs, response.reference());

        log.info("✅ Successfully migrated savings for Account ID: {} - Amount Deposited: {}", account.getId(), request.amount());
        return response.reference();
    }
}