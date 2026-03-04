package com.jaytechwave.sacco.modules.accounting.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.*;
import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntry;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntryLine;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntryStatus;
import com.jaytechwave.sacco.modules.accounting.domain.repository.AccountRepository;
import com.jaytechwave.sacco.modules.accounting.domain.repository.JournalEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class JournalEntryService {

    private final JournalEntryRepository journalEntryRepository;
    private final AccountRepository accountRepository;

    /**
     * THE GATEKEEPER: Processes all journal entries and enforces double-entry rules.
     */
    @Transactional
    public JournalEntryResponse postEntry(CreateJournalEntryRequest request) {
        if (journalEntryRepository.existsByReferenceNumber(request.referenceNumber())) {
            throw new IllegalArgumentException("Journal Entry with reference " + request.referenceNumber() + " already exists.");
        }

        // 1. Math Validation
        validateDoubleEntry(request.lines());

        // 2. Build Header
        JournalEntry entry = JournalEntry.builder()
                .transactionDate(request.transactionDate())
                .referenceNumber(request.referenceNumber())
                .description(request.description())
                .status(JournalEntryStatus.POSTED)
                .build();

        // 3. Build Lines
        for (JournalEntryLineRequest lineReq : request.lines()) {
            Account account = accountRepository.findByAccountCode(lineReq.accountCode())
                    .orElseThrow(() -> new IllegalArgumentException("Account not found: " + lineReq.accountCode()));

            if (!account.isActive()) {
                throw new IllegalStateException("Cannot post to inactive account: " + lineReq.accountCode());
            }

            JournalEntryLine line = JournalEntryLine.builder()
                    .account(account)
                    .memberId(lineReq.memberId())
                    .debitAmount(lineReq.debitAmount())
                    .creditAmount(lineReq.creditAmount())
                    .description(lineReq.description())
                    .build();

            entry.addLine(line);
        }

        JournalEntry savedEntry = journalEntryRepository.save(entry);
        log.info("Posted Journal Entry: {} with {} lines", savedEntry.getReferenceNumber(), savedEntry.getLines().size());

        return mapToResponse(savedEntry);
    }

    @Transactional(readOnly = true)
    public List<JournalEntryResponse> getAllJournalEntries() {
        return journalEntryRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private void validateDoubleEntry(List<JournalEntryLineRequest> lines) {
        if (lines == null || lines.size() < 2) {
            throw new IllegalArgumentException("Journal entry must have at least two lines (a debit and a credit).");
        }

        BigDecimal totalDebits = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;

        for (JournalEntryLineRequest line : lines) {
            boolean hasDebit = line.debitAmount().compareTo(BigDecimal.ZERO) > 0;
            boolean hasCredit = line.creditAmount().compareTo(BigDecimal.ZERO) > 0;

            if (hasDebit && hasCredit) {
                throw new IllegalArgumentException("A single line cannot contain both a debit and a credit.");
            }
            if (!hasDebit && !hasCredit) {
                throw new IllegalArgumentException("A journal line must have a value greater than 0 for either debit or credit.");
            }

            totalDebits = totalDebits.add(line.debitAmount());
            totalCredits = totalCredits.add(line.creditAmount());
        }

        if (totalDebits.compareTo(totalCredits) != 0) {
            throw new IllegalArgumentException(
                    String.format("Trial Balance failure: Total Debits (%.2f) != Total Credits (%.2f)", totalDebits, totalCredits)
            );
        }
    }

    // =========================================================================
    // TEMPLATES (Wrappers that utilize the Gatekeeper for standardized events)
    // =========================================================================

    /**
     * Use when M-Pesa confirms a member has paid their Registration Fee.
     * DEBIT: 1120 (M-Pesa Clearing)
     * CREDIT: 4210 (Registration Fees Income)
     */
    @Transactional
    public JournalEntryResponse postRegistrationFeeTemplate(UUID memberId, BigDecimal amount, String receiptNumber) {
        List<JournalEntryLineRequest> lines = List.of(
                new JournalEntryLineRequest("1120", memberId, amount, BigDecimal.ZERO, "M-Pesa Receipt: " + receiptNumber),
                new JournalEntryLineRequest("4210", memberId, BigDecimal.ZERO, amount, "New Member Registration Fee")
        );

        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(),
                "REG-" + receiptNumber,
                "Registration Fee via M-Pesa",
                lines
        );

        return postEntry(request);
    }

    /**
     * Use when M-Pesa confirms a standard BOSA Savings Deposit.
     * DEBIT: 1120 (M-Pesa Clearing)
     * CREDIT: 2210 (Member BOSA Savings)
     */
    @Transactional
    public JournalEntryResponse postBosaSavingsDepositTemplate(UUID memberId, BigDecimal amount, String receiptNumber) {
        List<JournalEntryLineRequest> lines = List.of(
                new JournalEntryLineRequest("1120", memberId, amount, BigDecimal.ZERO, "M-Pesa Receipt: " + receiptNumber),
                new JournalEntryLineRequest("2210", memberId, BigDecimal.ZERO, amount, "BOSA Savings Contribution")
        );

        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(),
                "DEP-" + receiptNumber,
                "BOSA Savings Deposit via M-Pesa",
                lines
        );

        return postEntry(request);
    }

    // =========================================================================
    // MAPPERS
    // =========================================================================

    private JournalEntryResponse mapToResponse(JournalEntry entry) {
        List<JournalEntryLineResponse> lineResponses = entry.getLines().stream()
                .map(line -> new JournalEntryLineResponse(
                        line.getId(),
                        line.getAccount().getAccountCode(),
                        line.getAccount().getAccountName(),
                        line.getMemberId(),
                        line.getDebitAmount(),
                        line.getCreditAmount(),
                        line.getDescription()
                )).collect(Collectors.toList());

        return new JournalEntryResponse(
                entry.getId(),
                entry.getTransactionDate(),
                entry.getReferenceNumber(),
                entry.getDescription(),
                entry.getStatus().name(),
                lineResponses
        );
    }

    @Transactional
    public JournalEntryResponse postSavingsTransaction(UUID memberId, BigDecimal amount, String type, String channel, String reference) {

        // 1. Idempotency Check
        String journalRef = "SAV-" + reference;
        Optional<JournalEntry> existingEntry = journalEntryRepository.findByReferenceNumber(journalRef);
        if (existingEntry.isPresent()) {
            log.info("Idempotency triggered: Journal entry for savings transaction {} already exists. Skipping.", journalRef);
            return mapToResponse(existingEntry.get());
        }

        String debitAccountCode;
        String creditAccountCode;

        // 2. Routing Logic (The Templates)
        if ("DEPOSIT".equalsIgnoreCase(type)) {
            creditAccountCode = "2100"; // Increase Savings Liability
            debitAccountCode = "MPESA".equalsIgnoreCase(channel) ? "1001" : "1000"; // Increase Asset
        } else if ("WITHDRAWAL".equalsIgnoreCase(type)) {
            debitAccountCode = "2100"; // Decrease Savings Liability
            creditAccountCode = "MPESA".equalsIgnoreCase(channel) ? "1001" : "1000"; // Decrease Asset
        } else {
            throw new IllegalArgumentException("Unsupported savings transaction type: " + type);
        }

        // 3. Fetch Accounts
        Account debitAccount = accountRepository.findByAccountCode(debitAccountCode)
                .orElseThrow(() -> new IllegalStateException("System Account " + debitAccountCode + " not found"));
        Account creditAccount = accountRepository.findByAccountCode(creditAccountCode)
                .orElseThrow(() -> new IllegalStateException("System Account " + creditAccountCode + " not found"));

        // 4. Build and Post Journal
        JournalEntry entry = JournalEntry.builder()
                .transactionDate(java.time.LocalDate.now())
                .referenceNumber(journalRef)
                .description("Savings " + type + " via " + channel + " for Member: " + memberId)
                .status(JournalEntryStatus.POSTED)
                .build();

        JournalEntryLine debitLine = JournalEntryLine.builder()
                .journalEntry(entry)
                .account(debitAccount)
                .memberId(memberId)
                .debitAmount(amount)
                .creditAmount(BigDecimal.ZERO)
                .description("Savings " + type + " Debit")
                .build();

        JournalEntryLine creditLine = JournalEntryLine.builder()
                .journalEntry(entry)
                .account(creditAccount)
                .memberId(memberId)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(amount)
                .description("Savings " + type + " Credit")
                .build();

        entry.setLines(java.util.List.of(debitLine, creditLine));
        JournalEntry savedEntry = journalEntryRepository.save(entry);

        log.info("Posted Savings Journal Entry: {} with amount {}", journalRef, amount);

        return mapToResponse(savedEntry);
    }

    @Transactional
    public void postLoanApplicationFee(UUID memberId, BigDecimal amount, String reference) {
        Account mpesaClearing = accountRepository.findByAccountCode("1001")
                .orElseThrow(() -> new IllegalStateException("M-Pesa Clearing account (1001) not found"));

        Account feeIncome = accountRepository.findByAccountCode("4100")
                .orElseThrow(() -> new IllegalStateException("Loan Fee Income account (4100) not found"));

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("FEE-" + reference)
                .description("Loan application fee payment")
                .transactionDate(LocalDate.now())
                .status(JournalEntryStatus.POSTED)
                .build();

        // Debit M-Pesa Clearing (Asset increases)
        JournalEntryLine debitLine = JournalEntryLine.builder()
                .account(mpesaClearing)
                .memberId(memberId) // Tracks which member paid!
                .debitAmount(amount)
                .creditAmount(BigDecimal.ZERO)
                .description("Loan application fee received via M-Pesa")
                .build();

        // Credit Fee Income (Revenue increases)
        JournalEntryLine creditLine = JournalEntryLine.builder()
                .account(feeIncome)
                .memberId(memberId) // Tracks which member paid!
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(amount)
                .description("Loan application fee income")
                .build();

        // Attach the lines to the main entry
        entry.addLine(debitLine);
        entry.addLine(creditLine);

        // Save the entry ONCE (CascadeType.ALL will automatically save the lines!)
        journalEntryRepository.save(entry);
    }

    @Transactional
    public void postLoanDisbursement(UUID memberId, BigDecimal principalAmount, String reference) {
        Account bankAccount = accountRepository.findByAccountCode("1002") // Equity Bank Account
                .orElseThrow(() -> new IllegalStateException("Bank account (1002) not found"));

        Account loansReceivable = accountRepository.findByAccountCode("1200") // Member Loans Receivable
                .orElseThrow(() -> new IllegalStateException("Loans Receivable account (1200) not found"));

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("LNDIS-" + reference)
                .description("Loan disbursement")
                .transactionDate(LocalDate.now())
                .status(JournalEntryStatus.POSTED)
                .build();

        // Debit Loans Receivable (Asset increases - members owe us more)
        JournalEntryLine debitLine = JournalEntryLine.builder()
                .account(loansReceivable)
                .memberId(memberId)
                .debitAmount(principalAmount)
                .creditAmount(BigDecimal.ZERO)
                .description("Loan principle receivable")
                .build();

        // Credit Bank (Asset decreases - cash leaves the Sacco bank)
        JournalEntryLine creditLine = JournalEntryLine.builder()
                .account(bankAccount)
                .memberId(memberId)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(principalAmount)
                .description("Loan disbursement payout")
                .build();

        entry.addLine(debitLine);
        entry.addLine(creditLine);

        journalEntryRepository.save(entry);
    }

    @Transactional
    public void postLoanRepayment(UUID memberId, BigDecimal totalAmount, BigDecimal interestAmount, String reference) {
        Account mpesaClearing = accountRepository.findByAccountCode("1001").orElseThrow();
        Account loanReceivable = accountRepository.findByAccountCode("1200").orElseThrow();
        Account interestIncome = accountRepository.findByAccountCode("4110").orElseThrow();

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("LNREP-" + reference)
                .description("Loan repayment via M-Pesa")
                .transactionDate(LocalDate.now())
                .status(JournalEntryStatus.POSTED)
                .build();

        // 1. DEBIT: Cash/Mpesa Clearing (Asset increases)
        entry.addLine(JournalEntryLine.builder().account(mpesaClearing).memberId(memberId).debitAmount(totalAmount).creditAmount(BigDecimal.ZERO).description("Loan Repayment Received").build());

        // 2. CREDIT: Interest Income (Revenue increases)
        if (interestAmount.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder().account(interestIncome).memberId(memberId).debitAmount(BigDecimal.ZERO).creditAmount(interestAmount).description("Loan Interest Income").build());
        }

        // 3. CREDIT: Loan Receivable (Asset decreases - member owes less)
        BigDecimal principalPortion = totalAmount.subtract(interestAmount);
        if (principalPortion.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder().account(loanReceivable).memberId(memberId).debitAmount(BigDecimal.ZERO).creditAmount(principalPortion).description("Loan Principal Repayment").build());
        }

        journalEntryRepository.save(entry);
    }

    @Transactional
    public void postPenaltyCreation(UUID memberId, BigDecimal amount, String reference) {
        Account penaltyReceivable = accountRepository.findByAccountCode("1300").orElseThrow();
        Account penaltyIncome = accountRepository.findByAccountCode("4120").orElseThrow();

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("PENC-" + reference)
                .description("Penalty levied against member")
                .transactionDate(LocalDate.now())
                .status(JournalEntryStatus.POSTED)
                .build();

        entry.addLine(JournalEntryLine.builder().account(penaltyReceivable).memberId(memberId).debitAmount(amount).creditAmount(BigDecimal.ZERO).description("Penalty Receivable").build());
        entry.addLine(JournalEntryLine.builder().account(penaltyIncome).memberId(memberId).debitAmount(BigDecimal.ZERO).creditAmount(amount).description("Penalty Income Accrued").build());

        journalEntryRepository.save(entry);
    }

    @Transactional
    public void postPenaltyInterestAccrual(UUID memberId, BigDecimal amount, String reference) {
        Account interestReceivable = accountRepository.findByAccountCode("1310").orElseThrow();
        Account interestIncome = accountRepository.findByAccountCode("4130").orElseThrow();

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("PENI-" + reference) // PENalty Interest
                .description("Penalty interest accrual")
                .transactionDate(LocalDate.now())
                .status(JournalEntryStatus.POSTED)
                .build();

        // 1. DEBIT: Penalty Interest Receivable (Asset increases)
        entry.addLine(JournalEntryLine.builder().account(interestReceivable).memberId(memberId).debitAmount(amount).creditAmount(BigDecimal.ZERO).description("Penalty Interest Receivable").build());

        // 2. CREDIT: Penalty Interest Income (Revenue increases)
        entry.addLine(JournalEntryLine.builder().account(interestIncome).memberId(memberId).debitAmount(BigDecimal.ZERO).creditAmount(amount).description("Penalty Interest Income Accrued").build());

        journalEntryRepository.save(entry);
    }

    @Transactional
    public void postPenaltyRepayment(UUID memberId, BigDecimal totalAllocated, BigDecimal interestAllocated, BigDecimal principalAllocated, String reference) {
        Account mpesaClearing = accountRepository.findByAccountCode("1001").orElseThrow();
        Account penaltyReceivable = accountRepository.findByAccountCode("1300").orElseThrow();
        Account interestReceivable = accountRepository.findByAccountCode("1310").orElseThrow();

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("PENREP-" + reference)
                .description("Penalty repayment via M-Pesa")
                .transactionDate(LocalDate.now())
                .status(JournalEntryStatus.POSTED)
                .build();

        // 1. DEBIT: M-Pesa Clearing (Asset increases)
        entry.addLine(JournalEntryLine.builder().account(mpesaClearing).memberId(memberId).debitAmount(totalAllocated).creditAmount(BigDecimal.ZERO).description("Penalty Repayment Received").build());

        // 2. CREDIT: Penalty Interest Receivable (Asset decreases)
        if (interestAllocated.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder().account(interestReceivable).memberId(memberId).debitAmount(BigDecimal.ZERO).creditAmount(interestAllocated).description("Penalty Interest Cleared").build());
        }

        // 3. CREDIT: Penalty Principal Receivable (Asset decreases)
        if (principalAllocated.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder().account(penaltyReceivable).memberId(memberId).debitAmount(BigDecimal.ZERO).creditAmount(principalAllocated).description("Penalty Principal Cleared").build());
        }

        journalEntryRepository.save(entry);
    }
}