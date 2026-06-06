package com.jaytechwave.sacco.modules.payments.job;

import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.MiniStatementResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.TransactionEntry;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopStatementTransaction;
import com.jaytechwave.sacco.modules.payments.domain.repository.CoopStatementTransactionRepository;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopConnectService;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Polls Co-op Bank mini-statement every 15 minutes.
 *
 * For each new transaction:
 *  1. Stores in coop_statement_transactions (deduplicated by transactionId)
 *  2. For CR transactions: extracts sender phone from narration parts[2]
 *  3. Hashes phone → looks up member in users table
 *  4. If member found → calls SavingsService.processMpesaPaybillDeposit()
 *                    → marks reconciled = true
 *  5. If not found  → leaves unreconciled for manual staff assignment
 *
 * This solves the paybill gap: members who pay via M-Pesa paybill directly
 * (without using the in-app STK push) will have their savings credited automatically.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MiniStatementPollingJob {

    private final CoopConnectService                   coopConnectService;
    private final CoopStatementTransactionRepository   statementRepository;
    private final UserRepository                       userRepository;
    private final PiiSearchHashConverter               piiHashConverter;
    private final SavingsService                       savingsService;

    private static final DateTimeFormatter DT_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    /** Runs every 15 minutes */
    @Scheduled(fixedDelay = 15 * 60 * 1000)
    @Transactional
    public void poll() {
        log.debug("MiniStatementPollingJob: polling Co-op...");
        try {
            MiniStatementResponse statement = coopConnectService.getMiniStatement();
            if (statement == null || statement.getTransactions() == null) {
                log.warn("MiniStatementPollingJob: null/empty response from Co-op");
                return;
            }
            if (!"0".equals(String.valueOf(statement.getMessageCode()))) {
                log.warn("MiniStatementPollingJob: Co-op error code={}", statement.getMessageCode());
                return;
            }

            int newCount = 0, creditedCount = 0;

            for (TransactionEntry t : statement.getTransactions()) {
                if (t.getTransactionId() == null) continue;

                // Idempotent — skip already stored
                if (statementRepository.existsByTransactionId(t.getTransactionId())) continue;

                boolean isCredit = "C".equalsIgnoreCase(t.getTransactionType());
                BigDecimal credit = t.getCreditAmount() != null ? BigDecimal.valueOf(t.getCreditAmount()) : BigDecimal.ZERO;
                BigDecimal debit  = t.getDebitAmount()  != null ? BigDecimal.valueOf(t.getDebitAmount())  : BigDecimal.ZERO;
                BigDecimal amount = isCredit ? credit : debit;

                // Parse narration: "REF~SACCO_NAME~SENDER_PHONE~..."
                String narration = t.getNarration() != null ? t.getNarration() : "";
                String[] parts   = narration.split("~");
                String mpesaRef  = null;
                String phone     = null;

                if (parts.length >= 3) {
                    mpesaRef = parts[0].trim();
                    // parts[1] = SACCO destination name — skip
                    phone    = normalizePhone(parts[2].trim());
                } else if (parts.length == 2) {
                    mpesaRef = parts[0].trim();
                    phone    = normalizePhone(parts[1].trim());
                }

                // Member lookup via phone hash
                String  memberName = null;
                java.util.UUID memberId = null;
                boolean reconciled = false;

                if (isCredit && phone != null) {
                    try {
                        String hash = piiHashConverter.convertToDatabaseColumn(phone);
                        java.util.Optional<User> userOpt = userRepository.findByPhoneNumberHash(hash);
                        if (userOpt.isPresent() && userOpt.get().getMember() != null) {
                            User user = userOpt.get();
                            memberId   = user.getMember().getId();
                            memberName = user.getFirstName() + " " + user.getLastName();
                        }
                    } catch (Exception e) {
                        log.warn("MiniStatementPollingJob: phone hash lookup failed for {}: {}", phone, e.getMessage());
                    }
                }

                // Store the transaction
                CoopStatementTransaction stored = CoopStatementTransaction.builder()
                        .transactionId(t.getTransactionId())
                        .transactionDate(parseDateTime(t.getTransactionDate()))
                        .valueDate(parseDateTime(t.getValueDate()))
                        .narration(memberName != null ? memberName : (phone != null ? phone : narration))
                        .rawNarration(narration)
                        .transactionType(isCredit ? "CR" : "DR")
                        .creditAmount(credit)
                        .debitAmount(debit)
                        .amount(amount)
                        .runningClearedBalance(t.getRunningClearedBalance() != null
                                ? BigDecimal.valueOf(t.getRunningClearedBalance()) : null)
                        .transactionReference(mpesaRef != null ? mpesaRef : t.getTransactionReference())
                        .senderPhone(phone)
                        .accountNumber(statement.getAccountNumber())
                        .memberId(memberId)
                        .reconciled(false) // set to true after successful savings credit
                        .fetchedAt(LocalDateTime.now())
                        .build();

                statementRepository.save(stored);
                newCount++;

                // Auto-credit savings for matched members
                if (isCredit && memberId != null && amount.compareTo(BigDecimal.ZERO) > 0) {
                    try {
                        String ref = mpesaRef != null ? mpesaRef : t.getTransactionId();
                        savingsService.processMpesaPaybillDeposit(memberId, amount, ref, phone);

                        // Mark reconciled
                        stored.setReconciled(true);
                        stored.setReconciledAt(LocalDateTime.now());
                        statementRepository.save(stored);
                        creditedCount++;

                        log.info("MiniStatementPollingJob: ✅ auto-credited KES {} to {} ({}). Ref={}",
                                amount, memberName, phone, ref);
                    } catch (Exception e) {
                        log.error("MiniStatementPollingJob: ❌ savings credit failed for member {} ref={}: {}",
                                memberId, mpesaRef, e.getMessage());
                        // Transaction still stored, just not reconciled — staff can assign manually
                    }
                }
            }

            if (newCount > 0) {
                log.info("MiniStatementPollingJob: {} new transaction(s) stored, {} auto-credited to savings.",
                        newCount, creditedCount);
            } else {
                log.debug("MiniStatementPollingJob: no new transactions.");
            }

        } catch (Exception e) {
            log.error("MiniStatementPollingJob failed: {}", e.getMessage(), e);
        }
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String s = raw.length() > 19 ? raw.substring(0, 19) : raw;
            return LocalDateTime.parse(s, DT_FMT);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private String normalizePhone(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return null;
        if (digits.startsWith("07") || digits.startsWith("01")) return "254" + digits.substring(1);
        if (digits.startsWith("7")  || digits.startsWith("1"))  return "254" + digits;
        return digits;
    }
}