package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntry;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntryLine;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntryStatus;
import com.jaytechwave.sacco.modules.accounting.domain.repository.AccountRepository;
import com.jaytechwave.sacco.modules.accounting.domain.repository.JournalEntryRepository;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.core.dto.HistoricalLoanDTOs;
import com.jaytechwave.sacco.modules.core.dto.HistoricalMemberRequest;
import com.jaytechwave.sacco.modules.core.dto.HistoricalWithdrawalRequest;
import com.jaytechwave.sacco.modules.core.dto.HistoricalSavingsRequest;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanProductRepository;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanRepaymentRepository;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanScheduleItemRepository;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanApplicationService;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanRepaymentService;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.CreateMemberRequest;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.MemberResponse;
import com.jaytechwave.sacco.modules.members.domain.entity.Gender;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.members.domain.service.MemberService;
import com.jaytechwave.sacco.modules.penalties.domain.entity.Penalty;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyRule;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyStatus;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRuleRepository;
import com.jaytechwave.sacco.modules.savings.api.dto.SavingsDTOs;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccount;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccountStatus;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MigrationService {

    @PersistenceContext
    private EntityManager entityManager;
    private final MemberService memberService;
    private final SavingsService savingsService;
    private final SavingsAccountRepository savingsAccountRepository;
    private final LoanApplicationRepository loanRepository;
    private final LoanProductRepository loanProductRepository;
    private final LoanRepaymentService loanRepaymentService;
    private final PenaltyRuleRepository penaltyRuleRepository;
    private final LoanRepaymentRepository loanRepaymentRepository;
    private final JournalEntryService journalEntryService;
    private final LoanApplicationService loanApplicationService;
    private final MemberRepository memberRepository;
    private final PenaltyRepository penaltyRepository;
    private final AccountRepository accountRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final UserRepository    userRepository;
    private final PasswordEncoder   passwordEncoder;
    private final JdbcTemplate      jdbcTemplate;
    private final LoanScheduleItemRepository scheduleItemRepository;

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

        LocalDate historicalDate = request.transactionDate();
        Timestamp historicalTs = Timestamp.valueOf(historicalDate.atStartOfDay());

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

        LocalDate historicalDate = request.transactionDate();
        Timestamp historicalTs = Timestamp.valueOf(historicalDate.atStartOfDay());

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
    // LOAN MIGRATION: PHASE 1 - DISBURSEMENT (WITH REAL DATES & GL BACKDATING)
    // ==============================================================================
    @Transactional
    public String seedHistoricalLoanDisbursement(HistoricalLoanDTOs.HistoricalLoanDisbursementRequest request) {
        log.info("🏦 Migrating historical Loan for {} via Front Door", request.memberNumber());

        Member member = memberRepository.findByMemberNumber(request.memberNumber())
                .orElseThrow(() -> new IllegalStateException("Member not found: " + request.memberNumber()));

        var product = loanProductRepository.findByName(request.loanProductCode())
                .orElseThrow(() -> new IllegalStateException("Loan Product not found: " + request.loanProductCode()));

        // 1. Use the REAL Disbursement Date
        LocalDate realDisbursementDate = request.firstPaymentDate();

        // 2. Fast-track application
        LoanApplication loan = new LoanApplication();
        loan.setMemberId(member.getId());
        loan.setLoanProduct(product);
        loan.setPrincipalAmount(request.principal());
        loan.setApplicationFee(BigDecimal.ZERO);
        loan.setApplicationFeePaid(true);
        loan.setTermWeeks(request.termWeeks() != null ? request.termWeeks() : 104);
        loan.setPurpose("MIGRATION: " + request.referenceNumber());
        loan.setReferenceNotes(request.referenceNumber());

        loan.setStatus(com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus.APPROVED);
        var savedApp = loanRepository.save(loan);

        // 3. Send it through the Front Door using the Real Date
        var response = loanApplicationService.disburseHistoricalApplication(
                savedApp.getId(),
                org.springframework.security.core.context.SecurityContextHolder
                        .getContext().getAuthentication().getName(),
                realDisbursementDate
        );

        // 4. 🚨 SCHEDULE OVERRIDE: If actual historical interest is provided,
        //    rewrite the schedule items to match the real Excel amounts exactly.
        //    Without this, the system uses the product's annual rate which may differ.
        if (request.interest() != null && request.interest().compareTo(BigDecimal.ZERO) > 0) {
            int termWeeks = request.termWeeks() != null ? request.termWeeks() : 104;
            BigDecimal totalInterest = request.interest();
            BigDecimal principal = request.principal();

            BigDecimal principalPerWeek = principal
                    .divide(BigDecimal.valueOf(termWeeks), 2, java.math.RoundingMode.HALF_UP);
            BigDecimal interestPerWeek = totalInterest
                    .divide(BigDecimal.valueOf(termWeeks), 2, java.math.RoundingMode.HALF_UP);

            BigDecimal principalAccumulated = BigDecimal.ZERO;
            BigDecimal interestAccumulated = BigDecimal.ZERO;

            var scheduleItems = scheduleItemRepository
                    .findByLoanApplicationIdOrderByWeekNumberAsc(response.id());

            for (int i = 0; i < scheduleItems.size(); i++) {
                var item = scheduleItems.get(i);
                boolean isLast = (i == scheduleItems.size() - 1);

                BigDecimal p = isLast
                        ? principal.subtract(principalAccumulated)
                        : principalPerWeek;
                BigDecimal ir = isLast
                        ? totalInterest.subtract(interestAccumulated)
                        : interestPerWeek;

                item.setPrincipalDue(p);
                item.setInterestDue(ir);
                item.setTotalDue(p.add(ir));
                scheduleItemRepository.save(item);

                principalAccumulated = principalAccumulated.add(p);
                interestAccumulated = interestAccumulated.add(ir);
            }

            log.info("✅ Schedule overridden with historical amounts for {}. " +
                            "Principal={}, Interest={}, WeeklyInstallment={}",
                    request.referenceNumber(), principal, totalInterest,
                    principal.add(totalInterest)
                            .divide(BigDecimal.valueOf(termWeeks), 2, java.math.RoundingMode.HALF_UP));
        }

        // 5. MAGIC BULLET: Force Hibernate to write to DB immediately
        entityManager.flush();
        entityManager.clear();

        // 6. Time Machine SQL — backdate all timestamps
        java.sql.Timestamp historicalTs = java.sql.Timestamp.valueOf(realDisbursementDate.atStartOfDay());

        jdbcTemplate.update(
                "UPDATE loan_applications SET created_at = ?, updated_at = ?, disbursed_at = ? WHERE id = ?",
                historicalTs, historicalTs, historicalTs, response.id());

        String disbJeRef = "LNDIS-" + request.referenceNumber();
        jdbcTemplate.update(
                "UPDATE journal_entries SET transaction_date = ?, created_at = ?, updated_at = ? WHERE reference_number = ?",
                realDisbursementDate, historicalTs, historicalTs, disbJeRef);
        jdbcTemplate.update(
                "UPDATE journal_entry_lines SET created_at = ?, updated_at = ? " +
                        "WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference_number = ?)",
                historicalTs, historicalTs, disbJeRef);

        return response.id().toString();
    }

    // ==============================================================================
    // LOAN MIGRATION: PHASE 2 - REPAYMENTS (WITH FLUSH MAGIC)
    // ==============================================================================
    @Transactional
    public String seedHistoricalLoanRepayment(HistoricalLoanDTOs.HistoricalLoanRepaymentRequest request) {
        log.info("📉 Migrating historical Loan Repayment for {} via Front Door", request.memberNumber());

        Member member = memberRepository.findByMemberNumber(request.memberNumber())
                .orElseThrow(() -> new IllegalStateException("Member not found: " + request.memberNumber()));

        var activeLoan = loanRepository.findFirstByMemberIdAndStatusOrderByCreatedAtDesc(
                member.getId(),
                LoanStatus.ACTIVE
        ).orElseThrow(() -> new IllegalStateException("No active loan found for member: " + request.memberNumber()));

        String adminEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();

        var response = loanRepaymentService.processHistoricalRepayment(
                activeLoan.getId(),
                request.amount(),
                request.referenceNumber(),
                request.transactionDate(),
                adminEmail
        );

        // 🚨 MAGIC BULLET: Force write to DB immediately!
        entityManager.flush();
        entityManager.clear();

        java.sql.Timestamp historicalTs = java.sql.Timestamp.valueOf(request.transactionDate().atStartOfDay());

        jdbcTemplate.update(
                "UPDATE loan_repayments SET created_at = ?, updated_at = ? WHERE id = ?",
                historicalTs, historicalTs, response.id()
        );

        // Clean, direct backdating without the awful while loops!
        String jeReference = "LNREP-" + request.referenceNumber();
        jdbcTemplate.update(
                "UPDATE journal_entries SET transaction_date = ?, created_at = ?, updated_at = ? WHERE reference_number = ?",
                request.transactionDate(), historicalTs, historicalTs, jeReference
        );
        jdbcTemplate.update(
                "UPDATE journal_entry_lines SET created_at = ?, updated_at = ? WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference_number = ?)",
                historicalTs, historicalTs, jeReference
        );

        return response.id().toString();
    }

    @Transactional
    public void migrateHistoricalPenalty(String memberNumber, BigDecimal amount, LocalDate penaltyDate, String reference) {
        Member member = memberRepository.findByMemberNumber(memberNumber)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberNumber));

        // 1. Fetch a generic/default PenaltyRule for migration
        // (Make sure you have a rule named "Lateness Penalty" or adjust the string below to match an existing rule in your DB)
        PenaltyRule rule = penaltyRuleRepository.findByName("Lateness Penalty")
                .orElseGet(() -> penaltyRuleRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new IllegalStateException("No Penalty Rules found in the system!")));

        // 2. Create the Penalty Record matching your EXACT entity fields
        Penalty penalty = Penalty.builder()
                .memberId(member.getId())
                .penaltyRule(rule)
                .referenceType("MIGRATION")
                .originalAmount(amount)
                .outstandingAmount(amount)
                .principalPaid(BigDecimal.ZERO)
                .interestPaid(BigDecimal.ZERO)
                .amountWaived(BigDecimal.ZERO)
                .status(PenaltyStatus.UNPAID)
                .createdAt(penaltyDate.atStartOfDay())
                .build();

        penaltyRepository.save(penalty);

        // 3. Post the Accounting for the specific historical date
        Account penaltyReceivable = accountRepository.findByAccountName("Penalty Receivable")
                .orElseThrow(() -> new IllegalStateException("Penalty Receivable account not found"));

        Account penaltyIncome = accountRepository.findByAccountName("Penalty Income")
                .orElseThrow(() -> new IllegalStateException("Penalty Income account not found"));

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("MIG-PEN-" + reference)
                .description("Migrated Historical Penalty")
                .transactionDate(penaltyDate) // Backdated!
                .status(JournalEntryStatus.POSTED)
                .build();

        entry.addLine(JournalEntryLine.builder()
                .account(penaltyReceivable)
                .memberId(member.getId())
                .debitAmount(amount)
                .creditAmount(BigDecimal.ZERO)
                .description("Penalty Receivable")
                .build());

        entry.addLine(JournalEntryLine.builder()
                .account(penaltyIncome)
                .memberId(member.getId())
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(amount)
                .description("Penalty Income Accrued")
                .build());

        journalEntryRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public String getActiveLoanIdByMemberNumber(String memberNumber) {
        Member member = memberRepository.findByMemberNumber(memberNumber)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberNumber));

        LoanApplication activeLoan = loanRepository.findFirstByMemberIdAndStatusOrderByCreatedAtDesc(
                member.getId(),
                LoanStatus.ACTIVE
        ).orElseThrow(() -> new IllegalStateException("No active loan found for member: " + memberNumber));

        return activeLoan.getId().toString();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public java.util.Map<String, Object> evaluatePenaltiesUpToDate(LocalDate evaluationDate) {
        log.info("🕰️ Running Time-Machine Cron for Date: {}", evaluationDate);

        PenaltyRule latenessRule = penaltyRuleRepository.findByName("Lateness Penalty")
                .orElseGet(() -> penaltyRuleRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new IllegalStateException("No Penalty Rules found! Please create one in the DB.")));

        // 🚨 FIX 1: Safely fallback to finding by Name if the Code lookup fails
        Account penaltyReceivable = accountRepository.findByAccountCode("1300")
                .orElseGet(() -> accountRepository.findByAccountName("Penalty Receivable")
                        .orElseThrow(() -> new IllegalStateException("Penalty Receivable account not found")));

        Account penaltyIncome = accountRepository.findByAccountCode("4120")
                .orElseGet(() -> accountRepository.findByAccountName("Penalty Income")
                        .orElseThrow(() -> new IllegalStateException("Penalty Income account not found")));

        // Fetch all past due items that haven't been paid or penalized yet
        java.util.List<com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem> missedItems =
                scheduleItemRepository.findAll().stream()
                        .filter(i -> i.getDueDate().isBefore(evaluationDate))
                        .filter(i -> i.getStatus() != com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus.PAID)
                        .filter(i -> i.getStatus() != com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus.OVERDUE)
                        .toList();

        int penaltiesApplied = 0;

        for (com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem item : missedItems) {
            // Mark it as OVERDUE so we don't penalize it twice
            item.setStatus(com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus.OVERDUE);
            scheduleItemRepository.save(item);

            BigDecimal penaltyAmount = BigDecimal.valueOf(200.00);
            LocalDate penaltyDate = item.getDueDate().plusDays(1); // Fined 1 day after due date

            Penalty penalty = Penalty.builder()
                    .memberId(item.getLoanApplication().getMemberId())
                    .penaltyRule(latenessRule)
                    .referenceType("MISSED_INSTALLMENT")
                    .originalAmount(penaltyAmount)
                    .outstandingAmount(penaltyAmount)
                    .principalPaid(BigDecimal.ZERO)
                    .interestPaid(BigDecimal.ZERO)
                    .amountWaived(BigDecimal.ZERO)
                    .status(PenaltyStatus.UNPAID)
                    .createdAt(penaltyDate.atStartOfDay())
                    .build();
            penaltyRepository.save(penalty);

            // 🚨 FIX 2: Bulletproof Reference Number (No more substring crashes!)
            String uniqueRef = java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            String journalRef = "PEN-CRON-" + item.getWeekNumber() + "-" + uniqueRef;

            JournalEntry entry = JournalEntry.builder()
                    .referenceNumber(journalRef)
                    .description("Missed Installment Penalty Week " + item.getWeekNumber())
                    .transactionDate(penaltyDate)
                    .status(JournalEntryStatus.POSTED)
                    .build();

            entry.addLine(JournalEntryLine.builder().account(penaltyReceivable).memberId(item.getLoanApplication().getMemberId())
                    .debitAmount(penaltyAmount).creditAmount(BigDecimal.ZERO).description("Penalty Receivable").build());
            entry.addLine(JournalEntryLine.builder().account(penaltyIncome).memberId(item.getLoanApplication().getMemberId())
                    .debitAmount(BigDecimal.ZERO).creditAmount(penaltyAmount).description("Penalty Income").build());

            journalEntryRepository.save(entry);

            entityManager.flush();
            entityManager.clear();

            // Time Machine Updates
            java.sql.Timestamp historicalTs = java.sql.Timestamp.valueOf(penaltyDate.atStartOfDay());
            jdbcTemplate.update("UPDATE penalties SET created_at = ?, updated_at = ? WHERE id = ?", historicalTs, historicalTs, penalty.getId());

            jdbcTemplate.update("UPDATE journal_entries SET transaction_date = ?, created_at = ?, updated_at = ? WHERE reference_number = ?",
                    penaltyDate, historicalTs, historicalTs, journalRef);
            jdbcTemplate.update("UPDATE journal_entry_lines SET created_at = ?, updated_at = ? WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference_number = ?)",
                    historicalTs, historicalTs, journalRef);

            penaltiesApplied++;
        }

        return java.util.Map.of(
                "message", "Time-Machine Cron executed successfully",
                "evaluationDate", evaluationDate.toString(),
                "penaltiesApplied", penaltiesApplied
        );
    }
}