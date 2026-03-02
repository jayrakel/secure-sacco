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
import java.util.List;
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
}