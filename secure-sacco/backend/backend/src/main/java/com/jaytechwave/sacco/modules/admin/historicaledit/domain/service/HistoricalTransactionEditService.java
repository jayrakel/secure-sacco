package com.jaytechwave.sacco.modules.admin.historicaledit.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntry;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntryLine;
import com.jaytechwave.sacco.modules.accounting.domain.repository.JournalEntryRepository;
import com.jaytechwave.sacco.modules.admin.historicaledit.api.dto.HistoricalEditDTOs.*;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccount;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsTransaction;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * SAC-269: TEMPORARY, isolated module for fixing historical migration
 * mistakes — savings transactions only, in V1. See V92 migration comment
 * and the package-level note in HistoricalEditDTOs: this whole package is
 * meant to be deleted in one shot before go-live.
 *
 * Every edit requires a reason and is written to the security audit log —
 * this is a privileged, dangerous tool, not a routine one.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HistoricalTransactionEditService {

    private final SavingsAccountRepository     savingsAccountRepository;
    private final SavingsTransactionRepository savingsTransactionRepository;
    private final JournalEntryRepository       journalEntryRepository;
    private final SecurityAuditService         securityAuditService;

    @Transactional(readOnly = true)
    public List<HistoricalTransactionItem> search(SearchRequest request) {
        SavingsAccount account = savingsAccountRepository.findByMemberId(request.memberId())
                .orElseThrow(() -> new IllegalArgumentException("This member has no savings account."));

        List<SavingsTransaction> transactions = savingsTransactionRepository
                .findBySavingsAccountIdOrderByCreatedAtDesc(account.getId());

        return transactions.stream()
                .filter(t -> {
                    if (t.getPostedAt() == null) return false;
                    var date = t.getPostedAt().toLocalDate();
                    boolean afterFrom = request.from() == null || !date.isBefore(request.from());
                    boolean beforeTo  = request.to() == null || !date.isAfter(request.to());
                    return afterFrom && beforeTo;
                })
                .map(t -> new HistoricalTransactionItem(
                        t.getId(), t.getType().name(), t.getChannel().name(), t.getAmount(),
                        t.getReference(), t.getStatus().name(), t.getPostedAt(),
                        journalEntryRepository.findByReferenceNumber(t.getReference()).isPresent()
                ))
                .toList();
    }

    @Transactional
    public EditTransactionResponse editTransaction(EditTransactionRequest request, String actorEmail) {
        if (request.reason() == null || request.reason().isBlank()) {
            throw new IllegalArgumentException("A reason is required for every historical edit.");
        }

        SavingsTransaction tx = savingsTransactionRepository.findById(request.transactionId())
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        BigDecimal previousAmount = tx.getAmount();
        String previousReference = tx.getReference();
        boolean glAdjusted = false;
        StringBuilder message = new StringBuilder();

        Optional<JournalEntry> linkedEntry = journalEntryRepository.findByReferenceNumber(tx.getReference());

        // ── Amount change ───────────────────────────────────────────────────
        if (request.newAmount() != null && request.newAmount().compareTo(previousAmount) != 0) {
            if (request.newAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Amount must be greater than zero.");
            }
            tx.setAmount(request.newAmount());

            if (linkedEntry.isPresent()) {
                JournalEntry entry = linkedEntry.get();
                List<JournalEntryLine> lines = entry.getLines();
                boolean simpleTwoLineEntry = lines.size() == 2
                        && lines.stream().allMatch(l ->
                                l.getDebitAmount().compareTo(previousAmount) == 0
                                || l.getCreditAmount().compareTo(previousAmount) == 0);

                if (simpleTwoLineEntry) {
                    for (JournalEntryLine line : lines) {
                        if (line.getDebitAmount().compareTo(BigDecimal.ZERO) > 0) {
                            line.setDebitAmount(request.newAmount());
                        }
                        if (line.getCreditAmount().compareTo(BigDecimal.ZERO) > 0) {
                            line.setCreditAmount(request.newAmount());
                        }
                    }
                    journalEntryRepository.save(entry);
                    glAdjusted = true;
                    message.append("Amount and linked GL entry both updated. ");
                } else {
                    message.append("Amount updated on the transaction, but the linked GL entry has an unusual shape ")
                           .append("(not a simple 2-line entry matching the original amount) — it was NOT auto-adjusted. ")
                           .append("Check the journal entry manually. ");
                }
            } else {
                message.append("Amount updated — no linked GL entry was found by reference, so nothing else to adjust. ");
            }
        }

        // ── Date change ──────────────────────────────────────────────────────
        if (request.newPostedAt() != null && !request.newPostedAt().equals(tx.getPostedAt())) {
            tx.setPostedAt(request.newPostedAt());
            linkedEntry.ifPresent(entry -> {
                entry.setTransactionDate(request.newPostedAt().toLocalDate());
                journalEntryRepository.save(entry);
            });
            message.append("Date updated. ");
        }

        // ── Reference change ─────────────────────────────────────────────────
        String newReference = previousReference;
        if (request.newReference() != null && !request.newReference().isBlank()
                && !request.newReference().equals(previousReference)) {
            if (savingsTransactionRepository.existsByReference(request.newReference())) {
                throw new IllegalArgumentException("Reference '" + request.newReference() + "' is already in use.");
            }
            newReference = request.newReference();
            tx.setReference(newReference);
            
            // 🟢 THE FIX: Create a final copy of the variable for the lambda
            final String finalNewReference = newReference;
            
            linkedEntry.ifPresent(entry -> {
                if (!journalEntryRepository.findByReferenceNumber(finalNewReference).isPresent()) {
                    entry.setReferenceNumber(finalNewReference);
                    journalEntryRepository.save(entry);
                }
            });
            message.append("Reference updated. ");
        }

        savingsTransactionRepository.save(tx);

        securityAuditService.logEvent(
                "HISTORICAL_TRANSACTION_EDITED",
                tx.getId().toString(),
                String.format("Actor: %s | Reason: %s | Amount: %s -> %s | Reference: %s -> %s | GL adjusted: %s",
                        actorEmail, request.reason(), previousAmount, tx.getAmount(),
                        previousReference, newReference, glAdjusted)
        );

        log.warn("HISTORICAL EDIT by {} on transaction {}: {}", actorEmail, tx.getId(), request.reason());

        return new EditTransactionResponse(
                tx.getId(), previousAmount, tx.getAmount(),
                previousReference, newReference, glAdjusted,
                message.toString().trim()
        );
    }
}