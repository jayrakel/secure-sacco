package com.jaytechwave.sacco.modules.payments.job;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.MiniStatementResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.TransactionEntry;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction;
import com.jaytechwave.sacco.modules.payments.domain.repository.CoopTransactionRepository;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopConnectService;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopEventNormalizer;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Polls Co-op Bank mini-statement every 15 minutes.
 *
 * <p><b>SAC-241 — coop_transactions as permanent bank-side ledger</b><br>
 * Every transaction returned by the mini-statement is persisted immediately to
 * {@code coop_transactions} BEFORE any GL posting or savings crediting. If the
 * mini-statement is capped at 10 transactions and the interval is busy, at least
 * every transaction seen during the poll is safely stored.
 *
 * <p><b>GL coverage</b> — all transaction types now get GL entries:
 * <ul>
 *   <li>Member credit (CR + memberId resolved) → savings credited + GL via SavingsService</li>
 *   <li>Non-member credit (CR + no memberId) → GL to suspense (2110) via JournalEntryService</li>
 *   <li>Debit (DR) → GL to bank charges (5210) via JournalEntryService</li>
 * </ul>
 *
 * <p><b>Retry logic</b> — on poll failure, retries up to 3 times with 60-second backoff.
 * Tracks last successful poll timestamp and alerts if no successful poll in 30 minutes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MiniStatementPollingJob {

    private final CoopConnectService         coopConnectService;
    private final CoopEventNormalizer        coopEventNormalizer;
    private final SavingsService             savingsService;
    private final CoopTransactionRepository  coopTransactionRepository;
    private final JournalEntryService        journalEntryService;

    /** Timestamp of the last successful poll. Used to detect and alert on outage gaps. */
    private static final AtomicReference<LocalDateTime> lastSuccessfulPoll =
            new AtomicReference<>(LocalDateTime.now());

    private static final int MAX_RETRIES       = 3;
    private static final long RETRY_DELAY_MS   = 60_000L;         // 60 seconds between retries
    private static final long ALERT_THRESHOLD_MINUTES = 30;       // alert after 30 min gap

    @Scheduled(fixedDelay = 15 * 60 * 1000)
    public void poll() {
        log.debug("MiniStatementPollingJob: polling Co-op mini-statement...");

        // Alert if we haven't had a successful poll in 30 minutes
        LocalDateTime lastSuccess = lastSuccessfulPoll.get();
        if (lastSuccess != null &&
                lastSuccess.plusMinutes(ALERT_THRESHOLD_MINUTES).isBefore(LocalDateTime.now())) {
            log.error("MiniStatementPollingJob: ⚠️ ALERT — no successful poll in {} minutes. " +
                    "Last success: {}. Transactions may be missed!", ALERT_THRESHOLD_MINUTES, lastSuccess);
        }

        int attempt = 0;
        while (attempt <= MAX_RETRIES) {
            try {
                boolean success = doPoll();
                if (success) {
                    lastSuccessfulPoll.set(LocalDateTime.now());
                    return;
                }
            } catch (Exception e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    log.error("MiniStatementPollingJob: all {} attempts failed. Last error: {}",
                            MAX_RETRIES, e.getMessage(), e);
                    return;
                }
                log.warn("MiniStatementPollingJob: attempt {}/{} failed — retrying in {}s. Error: {}",
                        attempt, MAX_RETRIES, RETRY_DELAY_MS / 1000, e.getMessage());
                try { Thread.sleep(RETRY_DELAY_MS); } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    /**
     * Executes one mini-statement poll cycle.
     *
     * @return true if the poll completed successfully (even if no new transactions)
     */
    private boolean doPoll() throws Exception {
        MiniStatementResponse statement = coopConnectService.getMiniStatement();
        if (statement == null || statement.getTransactions() == null) {
            log.warn("MiniStatementPollingJob: null/empty response from Co-op");
            return false;
        }
        if (!"0".equals(String.valueOf(statement.getMessageCode()))) {
            log.warn("MiniStatementPollingJob: Co-op error code={}", statement.getMessageCode());
            return false;
        }

        int stored   = 0;
        int credited = 0;
        int glPosted = 0;

        for (TransactionEntry t : statement.getTransactions()) {

            // ── STEP 1: Persist immediately — before any GL or savings logic ──────
            // normalizeMiniStatementEntry is idempotent: returns empty if already stored
            Optional<CoopTransaction> storedOpt = coopEventNormalizer.normalizeMiniStatementEntry(
                    t, statement.getAccountNumber(), null);

            if (storedOpt.isEmpty()) continue; // already existed — skip processing
            stored++;

            CoopTransaction tx = storedOpt.get();
            boolean isCredit = "CR".equals(tx.getTransactionType());
            LocalDate valueDate = tx.getValueDate() != null
                    ? tx.getValueDate().toLocalDate()
                    : tx.getCreatedAt().toLocalDate();

            // ── STEP 2: Post GL entry for every new transaction ───────────────────
            if (isCredit && tx.getMemberId() != null) {
                // Member credit — GL is posted by SavingsService.processMpesaPaybillDeposit below
                // (it calls journalEntryService.postSavingsTransaction internally)
            } else if (isCredit && tx.getMemberId() == null) {
                // Non-member credit — park in suspense, post GL immediately
                try {
                    journalEntryService.postNonMemberBankCredit(
                            tx.getAmount(),
                            tx.getMpesaRef() != null ? tx.getMpesaRef() : tx.getCoopTransactionId(),
                            tx.getRawNarration(),
                            valueDate);
                    glPosted++;
                    log.info("MiniStatementPollingJob: 📒 Unmatched credit GL posted — KES {} ref={}",
                            tx.getAmount(), tx.getMpesaRef());
                } catch (Exception e) {
                    log.error("MiniStatementPollingJob: GL FAILED for unmatched credit ref={} — {}",
                            tx.getMpesaRef(), e.getMessage(), e);
                }
            } else {
                // Debit transaction — bank charge, transfer out, reversal
                try {
                    journalEntryService.postAccountDebit(
                            tx.getAmount(),
                            tx.getMpesaRef() != null ? tx.getMpesaRef() : tx.getCoopTransactionId(),
                            tx.getRawNarration(),
                            valueDate);
                    glPosted++;
                    log.info("MiniStatementPollingJob: 📒 Debit GL posted — KES {} narration={}",
                            tx.getAmount(), tx.getRawNarration());
                } catch (Exception e) {
                    log.error("MiniStatementPollingJob: GL FAILED for debit ref={} — {}",
                            tx.getMpesaRef(), e.getMessage(), e);
                }
            }

            // ── STEP 3: Credit member savings (only for resolved member credits) ──
            if (isCredit && tx.getMemberId() != null && !tx.isSavingsCredited()) {
                try {
                    LocalDateTime savingsValueDate =
                            tx.getValueDate() != null ? tx.getValueDate() : tx.getCreatedAt();

                    savingsService.processMpesaPaybillDeposit(
                            tx.getMemberId(),
                            tx.getAmount(),
                            tx.getMpesaRef(),
                            tx.getSenderPhone(),
                            savingsValueDate);

                    tx.setSavingsCredited(true);
                    tx.setSavingsCreditedAt(LocalDateTime.now());
                    coopTransactionRepository.save(tx);
                    credited++;

                    log.info("MiniStatementPollingJob: ✅ Savings credited — {} KES {} ref={}",
                            tx.getSenderName(), tx.getAmount(), tx.getMpesaRef());

                } catch (Exception e) {
                    log.error("MiniStatementPollingJob: savings credit FAILED ref={} — {}",
                            tx.getMpesaRef(), e.getMessage(), e);
                }
            }
        }

        if (stored > 0 || credited > 0 || glPosted > 0) {
            log.info("MiniStatementPollingJob: {} stored, {} savings credited, {} GL entries posted.",
                    stored, credited, glPosted);
        } else {
            log.debug("MiniStatementPollingJob: no new transactions.");
        }

        return true;
    }
}