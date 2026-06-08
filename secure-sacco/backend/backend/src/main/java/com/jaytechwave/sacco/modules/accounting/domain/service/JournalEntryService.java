package com.jaytechwave.sacco.modules.accounting.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.*;
import com.jaytechwave.sacco.modules.accounting.domain.entity.*;
import com.jaytechwave.sacco.modules.accounting.domain.repository.AccountRepository;
import com.jaytechwave.sacco.modules.accounting.domain.repository.JournalEntryRepository;
import com.jaytechwave.sacco.modules.accounting.domain.entity.AccountType;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    private final SecurityAuditService securityAuditService;

    /**
     * THE GATEKEEPER: Processes all journal entries and enforces double-entry rules.
     * Audit log is only written here when called directly (manual journal entries).
     * Internal template calls (postLoanDisbursement, postSavingsTransaction etc.) are
     * NOT logged here — their callers (LoanApplicationService, SavingsService etc.)
     * already emit the appropriate business-level audit event.
     */
    @Transactional
    public JournalEntryResponse postEntry(CreateJournalEntryRequest request) {
        if (journalEntryRepository.existsByReferenceNumber(request.referenceNumber())) {
            throw new IllegalArgumentException("Journal Entry with reference " + request.referenceNumber() + " already exists.");
        }

        validateDoubleEntry(request.lines());

        JournalEntry entry = JournalEntry.builder()
                .transactionDate(request.transactionDate())
                .referenceNumber(request.referenceNumber())
                .description(request.description())
                .status(JournalEntryStatus.POSTED)
                .build();

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

        // Audit: only for manually created journal entries (called from controller, not from templates)
        securityAuditService.logEvent(
                "JOURNAL_ENTRY_POSTED",
                savedEntry.getReferenceNumber(),
                "Manual journal entry posted: " + savedEntry.getDescription()
                        + " (" + savedEntry.getLines().size() + " lines)"
        );

        return mapToResponse(savedEntry);
    }

    @Transactional(readOnly = true)
    public Page<JournalEntryResponse> getAllJournalEntries(Pageable pageable) {
        return journalEntryRepository.findAll(pageable)
                .map(this::mapToResponse);
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
    // TEMPLATES — internal use only, no audit here (callers log business events)
    // =========================================================================

    @Transactional
    public JournalEntryResponse postRegistrationFeeTemplate(UUID memberId, BigDecimal amount, String receiptNumber) {
        List<JournalEntryLineRequest> lines = List.of(
                new JournalEntryLineRequest("1120", memberId, amount, BigDecimal.ZERO, "M-Pesa Receipt: " + receiptNumber),
                new JournalEntryLineRequest("4210", memberId, BigDecimal.ZERO, amount, "New Member Registration Fee")
        );
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "REG-" + receiptNumber, "Registration Fee via M-Pesa", lines
        );
        // Call the raw save path (no audit — the payment handler logs PAYMENT_RECEIVED)
        return postEntryInternal(request);
    }

    @Transactional
    public JournalEntryResponse postBosaSavingsDepositTemplate(UUID memberId, BigDecimal amount, String receiptNumber) {
        List<JournalEntryLineRequest> lines = List.of(
                new JournalEntryLineRequest("1120", memberId, amount, BigDecimal.ZERO, "M-Pesa Receipt: " + receiptNumber),
                new JournalEntryLineRequest("2210", memberId, BigDecimal.ZERO, amount, "BOSA Savings Contribution")
        );
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "DEP-" + receiptNumber, "BOSA Savings Deposit via M-Pesa", lines
        );
        return postEntryInternal(request);
    }

    @Transactional
    public JournalEntryResponse postSavingsTransaction(UUID memberId, BigDecimal amount, String type, String channel, String reference) {
        return postSavingsTransaction(memberId, amount, type, channel, reference, java.time.LocalDate.now());
    }

    /**
     * Date-aware overload — use this for paybill / mini-statement deposits where the
     * transaction happened in the past. Passing the original {@code valueDate} ensures
     * the GL entry is dated to the actual payment day, not the day reconciliation ran.
     * This prevents false late-payment flags and incorrect penalty triggers.
     */
    public JournalEntryResponse postSavingsTransaction(UUID memberId, BigDecimal amount, String type, String channel, String reference, java.time.LocalDate transactionDate) {
        String journalRef = "SAV-" + reference;
        Optional<JournalEntry> existingEntry = journalEntryRepository.findByReferenceNumber(journalRef);
        if (existingEntry.isPresent()) {
            log.info("Idempotency triggered: Journal entry for savings transaction {} already exists. Skipping.", journalRef);
            return mapToResponse(existingEntry.get());
        }

        String debitAccountCode;
        String creditAccountCode;

        if ("DEPOSIT".equalsIgnoreCase(type)) {
            creditAccountCode = "2100";
            // Any MPESA variant (MPESA, MPESA_PAYBILL, MPESA_COOP_IPN) → M-Pesa Clearing (1001)
            // Cash/other → Cash on Hand (1000)
            debitAccountCode = channel != null && channel.toUpperCase().contains("MPESA") ? "1001" : "1000";
        } else if ("WITHDRAWAL".equalsIgnoreCase(type)) {
            debitAccountCode  = "2100";
            creditAccountCode = channel != null && channel.toUpperCase().contains("MPESA") ? "1001" : "1000";
        } else {
            throw new IllegalArgumentException("Unsupported savings transaction type: " + type);
        }

        Account debitAccount = accountRepository.findByAccountCode(debitAccountCode)
                .orElseThrow(() -> new IllegalStateException("System Account " + debitAccountCode + " not found"));
        Account creditAccount = accountRepository.findByAccountCode(creditAccountCode)
                .orElseThrow(() -> new IllegalStateException("System Account " + creditAccountCode + " not found"));

        JournalEntry entry = JournalEntry.builder()
                .transactionDate(transactionDate)
                .referenceNumber(journalRef)
                .description("Savings " + type + " via " + channel + " for Member: " + memberId)
                .status(JournalEntryStatus.POSTED)
                .build();

        entry.setLines(java.util.List.of(
                JournalEntryLine.builder().journalEntry(entry).account(debitAccount).memberId(memberId)
                        .debitAmount(amount).creditAmount(BigDecimal.ZERO).description("Savings " + type + " Debit").build(),
                JournalEntryLine.builder().journalEntry(entry).account(creditAccount).memberId(memberId)
                        .debitAmount(BigDecimal.ZERO).creditAmount(amount).description("Savings " + type + " Credit").build()
        ));

        JournalEntry savedEntry = journalEntryRepository.save(entry);
        log.info("Posted Savings Journal Entry: {} dated {} with amount {}", journalRef, transactionDate, amount);
        return mapToResponse(savedEntry);
    }

    @Transactional
    public void postLoanApplicationFee(UUID memberId, BigDecimal amount, String reference) {
        Account mpesaClearing = accountRepository.findByAccountCode("1001")
                .orElseThrow(() -> new IllegalStateException("M-Pesa Clearing account (1001) not found"));
        Account feeIncome = accountRepository.findByAccountCode("4100")
                .orElseThrow(() -> new IllegalStateException("Loan Fee Income account (4100) not found"));

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("FEE-" + reference).description("Loan application fee payment")
                .transactionDate(LocalDate.now()).status(JournalEntryStatus.POSTED).build();

        entry.addLine(JournalEntryLine.builder().account(mpesaClearing).memberId(memberId)
                .debitAmount(amount).creditAmount(BigDecimal.ZERO)
                .description("Loan application fee received via M-Pesa").build());
        entry.addLine(JournalEntryLine.builder().account(feeIncome).memberId(memberId)
                .debitAmount(BigDecimal.ZERO).creditAmount(amount)
                .description("Loan application fee income").build());

        journalEntryRepository.save(entry);
    }

    // 🚨 UPDATED WITH IDEMPOTENCY GUARD
    @Transactional
    public void postLoanDisbursement(UUID memberId, BigDecimal principalAmount, String reference) {
        String journalRef = "LNDIS-" + reference;
        if (journalEntryRepository.existsByReferenceNumber(journalRef)) {
            log.warn("Idempotency: {} already exists, skipping.", journalRef);
            return;
        }

        Account bankAccount = accountRepository.findByAccountCode("1002")
                .orElseThrow(() -> new IllegalStateException("Bank account (1002) not found"));
        Account loansReceivable = accountRepository.findByAccountCode("1200")
                .orElseThrow(() -> new IllegalStateException("Loans Receivable account (1200) not found"));

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber(journalRef).description("Loan disbursement")
                .transactionDate(LocalDate.now()).status(JournalEntryStatus.POSTED).build();

        entry.addLine(JournalEntryLine.builder().account(loansReceivable).memberId(memberId)
                .debitAmount(principalAmount).creditAmount(BigDecimal.ZERO)
                .description("Loan principle receivable").build());
        entry.addLine(JournalEntryLine.builder().account(bankAccount).memberId(memberId)
                .debitAmount(BigDecimal.ZERO).creditAmount(principalAmount)
                .description("Loan disbursement payout").build());

        journalEntryRepository.save(entry);
    }

    // 🚨 UPDATED WITH IDEMPOTENCY, EMPTY TRANSACTION AND INTEREST OVERFLOW GUARDS
    @Transactional
    public void postLoanRepayment(UUID memberId, BigDecimal totalAmount, BigDecimal interestAmount, String reference) {
        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Cannot post repayment journal entry for amount <= 0. Ref: {}", reference);
            return;
        }

        if (interestAmount.compareTo(totalAmount) > 0) {
            throw new IllegalStateException(
                    "Interest amount cannot exceed total repayment amount. Ref: " + reference +
                            " | total=" + totalAmount + " | interest=" + interestAmount
            );
        }

        String journalRef = "LNREP-" + reference;
        if (journalEntryRepository.existsByReferenceNumber(journalRef)) {
            log.warn("Idempotency: {} already exists, skipping.", journalRef);
            return;
        }

        Account mpesaClearing = accountRepository.findByAccountCode("1001").orElseThrow();
        Account loanReceivable = accountRepository.findByAccountCode("1200").orElseThrow();
        Account interestIncome  = accountRepository.findByAccountCode("4110").orElseThrow();

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber(journalRef).description("Loan repayment via M-Pesa")
                .transactionDate(LocalDate.now()).status(JournalEntryStatus.POSTED).build();

        entry.addLine(JournalEntryLine.builder().account(mpesaClearing).memberId(memberId)
                .debitAmount(totalAmount).creditAmount(BigDecimal.ZERO)
                .description("Loan Repayment Received").build());

        if (interestAmount.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder().account(interestIncome).memberId(memberId)
                    .debitAmount(BigDecimal.ZERO).creditAmount(interestAmount)
                    .description("Loan Interest Income").build());
        }

        BigDecimal principalPortion = totalAmount.subtract(interestAmount);
        if (principalPortion.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder().account(loanReceivable).memberId(memberId)
                    .debitAmount(BigDecimal.ZERO).creditAmount(principalPortion)
                    .description("Loan Principal Repayment").build());
        }

        journalEntryRepository.save(entry);
    }

    @Transactional
    public void postPenaltyCreation(UUID memberId, BigDecimal amount, String reference) {
        Account penaltyReceivable = accountRepository.findByAccountCode("1300").orElseThrow();
        Account penaltyIncome = accountRepository.findByAccountCode("4120").orElseThrow();

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("PENC-" + reference).description("Penalty levied against member")
                .transactionDate(LocalDate.now()).status(JournalEntryStatus.POSTED).build();

        entry.addLine(JournalEntryLine.builder().account(penaltyReceivable).memberId(memberId)
                .debitAmount(amount).creditAmount(BigDecimal.ZERO).description("Penalty Receivable").build());
        entry.addLine(JournalEntryLine.builder().account(penaltyIncome).memberId(memberId)
                .debitAmount(BigDecimal.ZERO).creditAmount(amount).description("Penalty Income Accrued").build());

        journalEntryRepository.save(entry);
    }

    @Transactional
    public void postPenaltyInterestAccrual(UUID memberId, BigDecimal amount, String reference) {
        Account interestReceivable = accountRepository.findByAccountCode("1310").orElseThrow();
        Account interestIncome = accountRepository.findByAccountCode("4130").orElseThrow();

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("PENI-" + reference).description("Penalty interest accrual")
                .transactionDate(LocalDate.now()).status(JournalEntryStatus.POSTED).build();

        entry.addLine(JournalEntryLine.builder().account(interestReceivable).memberId(memberId)
                .debitAmount(amount).creditAmount(BigDecimal.ZERO).description("Penalty Interest Receivable").build());
        entry.addLine(JournalEntryLine.builder().account(interestIncome).memberId(memberId)
                .debitAmount(BigDecimal.ZERO).creditAmount(amount).description("Penalty Interest Income Accrued").build());

        journalEntryRepository.save(entry);
    }

    @Transactional
    public void postPenaltyRepayment(UUID memberId, BigDecimal totalAllocated, BigDecimal interestAllocated,
                                     BigDecimal principalAllocated, String reference) {
        Account mpesaClearing = accountRepository.findByAccountCode("1001").orElseThrow();
        Account penaltyReceivable = accountRepository.findByAccountCode("1300").orElseThrow();
        Account interestReceivable = accountRepository.findByAccountCode("1310").orElseThrow();

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("PENREP-" + reference).description("Penalty repayment via M-Pesa")
                .transactionDate(LocalDate.now()).status(JournalEntryStatus.POSTED).build();

        entry.addLine(JournalEntryLine.builder().account(mpesaClearing).memberId(memberId)
                .debitAmount(totalAllocated).creditAmount(BigDecimal.ZERO).description("Penalty Repayment Received").build());

        if (interestAllocated.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder().account(interestReceivable).memberId(memberId)
                    .debitAmount(BigDecimal.ZERO).creditAmount(interestAllocated).description("Penalty Interest Cleared").build());
        }

        if (principalAllocated.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder().account(penaltyReceivable).memberId(memberId)
                    .debitAmount(BigDecimal.ZERO).creditAmount(principalAllocated).description("Penalty Principal Cleared").build());
        }

        journalEntryRepository.save(entry);
    }

    @Transactional
    public void postPenaltyWaiver(UUID memberId, BigDecimal amount, String reference) {
        Account penaltyReceivable = accountRepository.findByAccountCode("1300").orElseThrow();
        Account penaltyIncome = accountRepository.findByAccountCode("4120").orElseThrow();

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber("PENW-" + reference).description("Penalty waiver/adjustment")
                .transactionDate(LocalDate.now()).status(JournalEntryStatus.POSTED).build();

        entry.addLine(JournalEntryLine.builder().account(penaltyIncome).memberId(memberId)
                .debitAmount(amount).creditAmount(BigDecimal.ZERO).description("Penalty Waiver - Income Reversal").build());
        entry.addLine(JournalEntryLine.builder().account(penaltyReceivable).memberId(memberId)
                .debitAmount(BigDecimal.ZERO).creditAmount(amount).description("Penalty Waiver - Receivable Reduction").build());

        journalEntryRepository.save(entry);
    }

    // =========================================================================
    // SAC-220: EXPENSE REIMBURSEMENT TEMPLATE
    // =========================================================================

    /**
     * Posts the GL entry for an approved member expense reimbursement claim.
     *
     * <pre>
     *   DR 5360 Member Expense Reimbursement (EXPENSE)
     *   CR 2100 Member Savings Deposits       (LIABILITY)
     * </pre>
     * The credit goes directly into the member's savings pool — the member
     * will see this reimbursement in their savings history like a regular deposit.
     *
     * No audit log here — the caller ({@code ExpenseClaimService.reviewClaim})
     * already writes the business-level {@code EXPENSE_CLAIM_APPROVED} event.
     *
     * @param memberId the member whose out-of-pocket expense is being reimbursed
     * @param amount   the approved reimbursement amount
     * @param claimId  the UUID of the {@code ExpenseClaim} (used in the reference)
     */
    @Transactional
    public void postExpenseReimbursementClaim(UUID memberId, BigDecimal amount, String claimId) {
        String journalRef = "EXP-" + claimId;
        if (journalEntryRepository.existsByReferenceNumber(journalRef)) {
            log.warn("Idempotency: {} already exists, skipping.", journalRef);
            return;
        }

        Account expenseAccount = accountRepository.findByAccountCode("5360")
                .orElseThrow(() -> new IllegalStateException(
                        "System Account 5360 (Member Expense Reimbursement) not found. Run V67 migration."));
        // Credit goes to member savings deposits (2100), not to payable (2190).
        // This immediately increases the member's savings balance on approval.
        Account savingsAccount = accountRepository.findByAccountCode("2100")
                .orElseThrow(() -> new IllegalStateException(
                        "System Account 2100 (Member Savings Deposits) not found."));

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber(journalRef)
                .description("Expense reimbursement credited to member savings — claim " + claimId)
                .transactionDate(LocalDate.now())
                .status(JournalEntryStatus.POSTED)
                .build();

        entry.addLine(JournalEntryLine.builder()
                .account(expenseAccount)
                .memberId(memberId)
                .debitAmount(amount)
                .creditAmount(BigDecimal.ZERO)
                .description("Expense reimbursement — debit expense account 5360")
                .build());

        entry.addLine(JournalEntryLine.builder()
                .account(savingsAccount)
                .memberId(memberId)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(amount)
                .description("Expense reimbursement — credit member savings 2100")
                .build());

        journalEntryRepository.save(entry);
        log.info("SAC-220: Posted expense reimbursement GL entry {} for member {} amount {}", journalRef, memberId, amount);
    }

    // =========================================================================
    // SAC-221: ASSET ACQUISITION TEMPLATE
    // =========================================================================

    /**
     * Posts the GL entry for a newly registered SACCO-owned fixed asset.
     *
     * <pre>
     *   DR {assetGlCode}  Fixed Asset account (from AssetCategory)  ← asset acquired
     *   CR 1110           Main Bank Account                          ← cash paid out
     * </pre>
     *
     * Idempotency: skips silently if {@code ASSET-{assetId}} has already been posted.
     *
     * @param assetId      UUID of the {@code SaccoAsset} being registered
     * @param assetName    display name used in journal line descriptions
     * @param cost         acquisition cost (must be &gt; 0)
     * @param glAccountCode the fixed asset GL account code derived from the asset's category
     */
    @Transactional
    public void postAssetAcquisition(UUID assetId, String assetName, BigDecimal cost, String glAccountCode) {
        String journalRef = "ASSET-" + assetId;
        if (journalEntryRepository.existsByReferenceNumber(journalRef)) {
            log.warn("Idempotency: {} already exists, skipping.", journalRef);
            return;
        }

        Account assetAccount = accountRepository.findByAccountCode(glAccountCode)
                .orElseThrow(() -> new IllegalStateException(
                        "Asset GL account " + glAccountCode + " not found. Ensure V45 migration has run."));
        Account bankAccount = accountRepository.findByAccountCode("1110")
                .orElseThrow(() -> new IllegalStateException(
                        "System Account 1110 (Main Bank Account) not found. Ensure V10_1 migration has run."));

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber(journalRef)
                .description("Asset acquisition: " + assetName)
                .transactionDate(LocalDate.now())
                .status(JournalEntryStatus.POSTED)
                .build();

        entry.addLine(JournalEntryLine.builder()
                .account(assetAccount)
                .debitAmount(cost)
                .creditAmount(BigDecimal.ZERO)
                .description("Asset acquisition (DR) - " + assetName)
                .build());

        entry.addLine(JournalEntryLine.builder()
                .account(bankAccount)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(cost)
                .description("Asset acquisition (CR) - " + assetName)
                .build());

        journalEntryRepository.save(entry);
        log.info("SAC-221: Posted asset acquisition GL entry {} for '{}' cost={}", journalRef, assetName, cost);
    }



    private JournalEntryResponse postEntryInternal(CreateJournalEntryRequest request) {
        if (journalEntryRepository.existsByReferenceNumber(request.referenceNumber())) {
            throw new IllegalArgumentException("Journal Entry with reference " + request.referenceNumber() + " already exists.");
        }
        validateDoubleEntry(request.lines());

        JournalEntry entry = JournalEntry.builder()
                .transactionDate(request.transactionDate())
                .referenceNumber(request.referenceNumber())
                .description(request.description())
                .status(JournalEntryStatus.POSTED)
                .build();

        for (JournalEntryLineRequest lineReq : request.lines()) {
            Account account = accountRepository.findByAccountCode(lineReq.accountCode())
                    .orElseThrow(() -> new IllegalArgumentException("Account not found: " + lineReq.accountCode()));
            if (!account.isActive()) {
                throw new IllegalStateException("Cannot post to inactive account: " + lineReq.accountCode());
            }
            entry.addLine(JournalEntryLine.builder()
                    .account(account).memberId(lineReq.memberId())
                    .debitAmount(lineReq.debitAmount()).creditAmount(lineReq.creditAmount())
                    .description(lineReq.description()).build());
        }

        JournalEntry savedEntry = journalEntryRepository.save(entry);
        log.info("Posted Journal Entry: {} with {} lines", savedEntry.getReferenceNumber(), savedEntry.getLines().size());
        return mapToResponse(savedEntry);
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
                entry.getId(), entry.getTransactionDate(), entry.getReferenceNumber(),
                entry.getDescription(), entry.getStatus().name(), lineResponses
        );
    }

    // 🚨 UPDATED WITH IDEMPOTENCY AND MATHEMATICAL GUARDS
    @Transactional
    public void postLoanRefinance(UUID memberId, BigDecimal oldLoanBalance, BigDecimal newLoanPrincipal, BigDecimal netCashDisbursed, String reference) {
        String journalRef = "LNREF-" + reference;
        if (journalEntryRepository.existsByReferenceNumber(journalRef)) {
            log.warn("Idempotency: {} already exists, skipping.", journalRef);
            return;
        }

        // Mathematical Guard: Ensure Trial Balance is respected before proceeding
        BigDecimal totalDebits = newLoanPrincipal;
        BigDecimal totalCredits = oldLoanBalance.add(netCashDisbursed);
        if (totalDebits.compareTo(totalCredits) != 0) {
            throw new IllegalStateException(String.format("Loan refinance entry is unbalanced: debits=%.2f credits=%.2f", totalDebits, totalCredits));
        }

        Account loanReceivable = accountRepository.findByAccountCode("1200")
                .orElseThrow(() -> new IllegalStateException("Loan Portfolio account not found"));

        Account bankAccount = accountRepository.findByAccountCode("1002")
                .orElseThrow(() -> new IllegalStateException("Bank/Cash account not found"));

        JournalEntry entry = JournalEntry.builder()
                .referenceNumber(journalRef)
                .transactionDate(java.time.LocalDate.now())
                .description("Loan Refinance/Top-up Disbursement")
                .status(JournalEntryStatus.POSTED)
                .build();

        // 1. Debit Loan Receivable for the FULL new loan amount
        entry.addLine(JournalEntryLine.builder()
                .account(loanReceivable)
                .memberId(memberId)
                .debitAmount(newLoanPrincipal)
                .creditAmount(BigDecimal.ZERO)
                .description("New Refinanced Loan Principal")
                .build());

        // 2. Credit Loan Receivable to clear the old loan's remaining balance
        if (oldLoanBalance.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder()
                    .account(loanReceivable)
                    .memberId(memberId)
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(oldLoanBalance)
                    .description("Clear Old Loan Balance")
                    .build());
        }

        // 3. Credit Bank/Cash for the actual physical money given to the member
        if (netCashDisbursed.compareTo(BigDecimal.ZERO) > 0) {
            entry.addLine(JournalEntryLine.builder()
                    .account(bankAccount)
                    .memberId(memberId)
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(netCashDisbursed)
                    .description("Net Cash Disbursed to Member")
                    .build());
        }

        journalEntryRepository.save(entry);
    }
}