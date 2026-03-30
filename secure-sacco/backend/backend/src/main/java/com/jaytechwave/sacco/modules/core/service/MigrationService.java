package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.core.dto.HistoricalLoanDTOs;
import com.jaytechwave.sacco.modules.core.dto.HistoricalMemberRequest;
import com.jaytechwave.sacco.modules.core.dto.HistoricalWithdrawalRequest;
import com.jaytechwave.sacco.modules.core.dto.HistoricalSavingsRequest;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanApplicationService;
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

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class MigrationService {

    @PersistenceContext
    private EntityManager entityManager;
    private final com.jaytechwave.sacco.modules.members.domain.service.MemberService memberService;
    private final com.jaytechwave.sacco.modules.savings.domain.service.SavingsService savingsService;
    private final com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository savingsAccountRepository;
    private final com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository loanRepository;
    private final com.jaytechwave.sacco.modules.loans.domain.repository.LoanProductRepository loanProductRepository;
    private final com.jaytechwave.sacco.modules.loans.domain.service.LoanRepaymentService loanRepaymentService;
    private final com.jaytechwave.sacco.modules.loans.domain.repository.LoanRepaymentRepository loanRepaymentRepository;
    private final com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService journalEntryService;
    private final LoanApplicationService loanApplicationService;
    private final UserRepository    userRepository;
    private final MemberRepository  memberRepository;
    private final PasswordEncoder   passwordEncoder;
    private final JdbcTemplate      jdbcTemplate;

    @Transactional
    public String seedHistoricalMember(HistoricalMemberRequest request) {
        log.info("🕰️  Migrating historical member: {} {} (Date: {})",
                request.firstName(), request.lastName(), request.registrationDate());

        CreateMemberRequest memberReq = new CreateMemberRequest();
        memberReq.setFirstName(request.firstName());
        memberReq.setLastName(request.lastName());
        memberReq.setEmail(request.email());
        memberReq.setPhoneNumber(request.phoneNumber());
        memberReq.setNationalId("MIGRATE-" + System.currentTimeMillis());
        memberReq.setDateOfBirth(request.registrationDate().minusYears(30));
        memberReq.setGender(Gender.MALE);

        MemberResponse memberResponse = memberService.createMember(memberReq);

        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new IllegalStateException(
                        "User not found after member creation — email: " + request.email()));

        user.setPasswordHash(passwordEncoder.encode(request.plainTextPassword()));
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        user.setMustChangePassword(false);
        userRepository.save(user);

        Member member = memberRepository.findById(memberResponse.getId())
                .orElseThrow(() -> new IllegalStateException("Member not found"));

        String historicalYear = String.valueOf(request.registrationDate().getYear());
        String currentYear = String.valueOf(java.time.Year.now().getValue());
        String correctedMemberNumber = member.getMemberNumber().replace(currentYear, historicalYear);

        member.setMemberNumber(correctedMemberNumber);
        member.setStatus(MemberStatus.ACTIVE);
        memberRepository.save(member);

        Timestamp historicalTs = Timestamp.valueOf(request.registrationDate().atStartOfDay());

        jdbcTemplate.update("UPDATE users   SET created_at = ? WHERE id = ?",
                historicalTs, user.getId());
        jdbcTemplate.update("UPDATE members SET created_at = ? WHERE id = ?",
                historicalTs, memberResponse.getId());

        log.info("✅ Migrated member {} — number: {}", request.email(), memberResponse.getMemberNumber());

        return memberResponse.getMemberNumber();
    }

    @Transactional
    public String seedHistoricalSavings(HistoricalSavingsRequest request) {
        log.info("💰 Migrating historical savings for {} - Amount: {} (Date: {})",
                request.memberNumber(), request.amount(), request.transactionDate());

        Member member = memberRepository.findByMemberNumber(request.memberNumber())
                .orElseThrow(() -> new IllegalStateException("Member not found: " + request.memberNumber()));

        // We execute this to ensure the account exists, but we drop the variable assignment to clear the warning
        savingsAccountRepository.findByMemberId(member.getId())
                .orElseGet(() -> {
                    log.info("Creating missing savings account for member: {}", member.getMemberNumber());
                    SavingsAccount newAccount = new SavingsAccount();
                    newAccount.setMemberId(member.getId());
                    newAccount.setStatus(SavingsAccountStatus.ACTIVE);
                    return savingsAccountRepository.save(newAccount);
                });

        SavingsDTOs.ManualDepositRequest depositReq =
                new SavingsDTOs.ManualDepositRequest(
                        member.getId(),
                        request.amount(),
                        request.referenceNumber()
                );

        SavingsDTOs.SavingsTransactionResponse response =
                savingsService.processManualDeposit(depositReq);

        entityManager.flush();
        entityManager.clear();

        java.time.LocalDate historicalDate = request.transactionDate();
        java.sql.Timestamp historicalTs = java.sql.Timestamp.valueOf(historicalDate.atStartOfDay());

        jdbcTemplate.update("UPDATE savings_transactions SET posted_at = ?, created_at = ?, updated_at = ? WHERE id = ?",
                historicalTs, historicalTs, historicalTs, response.transactionId());

        String jeReference = "SAV-" + response.reference();
        int rowsUpdated = 0;
        int maxAttempts = 50;

        while (rowsUpdated == 0 && maxAttempts > 0) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            rowsUpdated = jdbcTemplate.update(
                    "UPDATE journal_entries SET transaction_date = ?, created_at = ?, updated_at = ? WHERE reference_number = ?",
                    historicalDate, historicalTs, historicalTs, jeReference
            );
            maxAttempts--;
        }

        if (rowsUpdated > 0) {
            jdbcTemplate.update(
                    "UPDATE journal_entry_lines SET created_at = ?, updated_at = ? WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference_number = ?)",
                    historicalTs, historicalTs, jeReference
            );
            log.info("✅ Successfully migrated & time-traveled Savings + Accounting for: {}", request.memberNumber());
        } else {
            log.warn("⚠️ Savings migrated, but Accounting Time Machine timed out for {} (Async thread took too long)", jeReference);
        }

        return response.reference();
    }

    @Transactional
    public String seedHistoricalWithdrawal(HistoricalWithdrawalRequest request) {
        log.info("💸 Migrating historical withdrawal for {} - Amount: {} (Date: {})",
                request.memberNumber(), request.amount(), request.transactionDate());

        Member member = memberRepository.findByMemberNumber(request.memberNumber())
                .orElseThrow(() -> new IllegalStateException("Member not found: " + request.memberNumber()));

        // We execute this to throw an error if missing, but drop the variable to clear the warning
        savingsAccountRepository.findByMemberId(member.getId())
                .orElseThrow(() -> new IllegalStateException("Savings account not found for: " + request.memberNumber()));

        SavingsDTOs.ManualWithdrawalRequest withdrawalReq = new SavingsDTOs.ManualWithdrawalRequest(
                member.getId(),
                request.amount(),
                request.referenceNumber()
        );

        SavingsDTOs.SavingsTransactionResponse response =
                savingsService.processManualWithdrawal(withdrawalReq);

        entityManager.flush();
        entityManager.clear();

        java.time.LocalDate historicalDate = request.transactionDate();
        java.sql.Timestamp historicalTs = java.sql.Timestamp.valueOf(historicalDate.atStartOfDay());

        jdbcTemplate.update(
                "UPDATE savings_transactions SET posted_at = ?, created_at = ?, updated_at = ? WHERE id = ?",
                historicalTs, historicalTs, historicalTs, response.transactionId()
        );

        String jeReference = "SAV-" + response.reference();
        int rowsUpdated = 0;
        int maxAttempts = 50;

        while (rowsUpdated == 0 && maxAttempts > 0) {
            try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            rowsUpdated = jdbcTemplate.update(
                    "UPDATE journal_entries SET transaction_date = ?, created_at = ?, updated_at = ? WHERE reference_number = ?",
                    historicalDate, historicalTs, historicalTs, jeReference
            );
            maxAttempts--;
        }

        if (rowsUpdated > 0) {
            jdbcTemplate.update(
                    "UPDATE journal_entry_lines SET created_at = ?, updated_at = ? WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference_number = ?)",
                    historicalTs, historicalTs, jeReference
            );
            log.info("✅ Historical withdrawal migrated & backdated for: {}", request.memberNumber());
        } else {
            log.warn("⚠️ Withdrawal migrated but accounting time machine timed out for {}", jeReference);
        }

        return response.reference();
    }

    // ==============================================================================
    // LOAN MIGRATION: PHASE 1 - DISBURSEMENT (WITH GRACE PERIOD GHOSTING)
    // ==============================================================================
    @Transactional
    public String seedHistoricalLoanDisbursement(HistoricalLoanDTOs.HistoricalLoanDisbursementRequest request) {
        log.info("🏦 Migrating historical Loan for {} via Front Door", request.memberNumber());

        Member member = memberRepository.findByMemberNumber(request.memberNumber())
                .orElseThrow(() -> new IllegalStateException("Member not found: " + request.memberNumber()));

        var product = loanProductRepository.findByName(request.loanProductCode())
                .orElseThrow(() -> new IllegalStateException("Loan Product not found: " + request.loanProductCode()));

        // 1. Calculate the Ghost Date
        long graceDays = product.getGracePeriodDays();
        LocalDate ghostDate = request.firstPaymentDate().minusWeeks(1).minusDays(graceDays);

        // 2. We have to "fast-track" an application through the queue to get it ready for disbursement
        LoanApplication loan = new LoanApplication();
        loan.setMemberId(member.getId());
        loan.setLoanProduct(product);
        loan.setPrincipalAmount(request.principal());
        loan.setApplicationFee(BigDecimal.ZERO);
        loan.setApplicationFeePaid(true);
        loan.setTermWeeks(request.termWeeks() != null ? request.termWeeks() : 104);
        loan.setPurpose("MIGRATION: " + request.referenceNumber());

        // Force it directly to APPROVED so the Service accepts it
        loan.setStatus(com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus.APPROVED);
        var savedApp = loanRepository.save(loan);

        // 3. Send it through the newly upgraded Front Door!
        // We pass the System Admin email and the historical Ghost Date
        var response = loanApplicationService.disburseHistoricalApplication(
                savedApp.getId(),
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName(),
                ghostDate
        );

        // 4. Force the SQL Created_At timestamp so the DB reflects the 2022 truth
        java.sql.Timestamp historicalTs = java.sql.Timestamp.valueOf(ghostDate.atStartOfDay());
        jdbcTemplate.update("UPDATE loan_applications SET created_at = ?, updated_at = ?, disbursed_at = ? WHERE id = ?",
                historicalTs, historicalTs, historicalTs, response.id());

        return response.id().toString();
    }

    // ==============================================================================
    // LOAN MIGRATION: PHASE 2 - REPAYMENTS (VIA FRONT DOOR)
    // ==============================================================================
    @Transactional
    public String seedHistoricalLoanRepayment(HistoricalLoanDTOs.HistoricalLoanRepaymentRequest request) {
        log.info("📉 Migrating historical Loan Repayment for {} via Front Door", request.memberNumber());

        Member member = memberRepository.findByMemberNumber(request.memberNumber())
                .orElseThrow(() -> new IllegalStateException("Member not found: " + request.memberNumber()));

        var activeLoan = loanRepository.findFirstByMemberIdAndStatusOrderByCreatedAtDesc(
                member.getId(),
                com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus.ACTIVE
        ).orElseThrow(() -> new IllegalStateException("No active loan found for member: " + request.memberNumber()));

        // 1. Send it through the newly upgraded Front Door!
        String adminEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();

        var response = loanRepaymentService.processHistoricalRepayment(
                activeLoan.getId(),
                request.amount(),
                request.referenceNumber(),
                request.transactionDate(),
                adminEmail
        );

        // 2. TIME MACHINE: Force the SQL Created_At timestamp so the DB reflects the 2022 truth
        java.sql.Timestamp historicalTs = java.sql.Timestamp.valueOf(request.transactionDate().atStartOfDay());

        jdbcTemplate.update(
                "UPDATE loan_repayments SET created_at = ?, updated_at = ? WHERE id = ?",
                historicalTs, historicalTs, response.id()
        );

        // 3. ASYNC TIME MACHINE: Backdate the Accounting Ledgers
        String jeReference = "LNREP-" + request.referenceNumber();
        int rowsUpdated = 0;
        int maxAttempts = 50;

        while (rowsUpdated == 0 && maxAttempts > 0) {
            try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            rowsUpdated = jdbcTemplate.update(
                    "UPDATE journal_entries SET transaction_date = ?, created_at = ?, updated_at = ? WHERE reference_number = ?",
                    request.transactionDate(), historicalTs, historicalTs, jeReference
            );
            maxAttempts--;
        }

        if (rowsUpdated > 0) {
            jdbcTemplate.update(
                    "UPDATE journal_entry_lines SET created_at = ?, updated_at = ? WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference_number = ?)",
                    historicalTs, historicalTs, jeReference
            );
        }

        return response.id().toString();
    }
}