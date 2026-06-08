package com.jaytechwave.sacco.modules.payments.job;

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

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Polls Co-op Bank mini-statement every 15 minutes.
 *
 * <p>For each new CR transaction where a member is resolved:
 * <ol>
 *   <li>Stores a clean {@link CoopTransaction} record via {@link CoopEventNormalizer}.</li>
 *   <li>Credits the member's savings account and posts the double-entry GL entry via
 *       {@link SavingsService#processMpesaPaybillDeposit}.</li>
 *   <li>Sets {@code CoopTransaction.savingsCredited = true} so subsequent polls and the
 *       re-enrich endpoint don't double-credit.</li>
 * </ol>
 *
 * <p>{@link SavingsService#processMpesaPaybillDeposit} is idempotent on {@code mpesaRef},
 * so it is safe to call even if the IPN already credited the same payment.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MiniStatementPollingJob {

    private final CoopConnectService       coopConnectService;
    private final CoopEventNormalizer      coopEventNormalizer;
    private final SavingsService           savingsService;
    private final CoopTransactionRepository coopTransactionRepository;

    @Scheduled(fixedDelay = 15 * 60 * 1000)
    public void poll() {
        log.debug("MiniStatementPollingJob: polling Co-op mini-statement...");
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

            int newCount     = 0;
            int creditedCount = 0;

            for (TransactionEntry t : statement.getTransactions()) {
                Optional<CoopTransaction> stored = coopEventNormalizer.normalizeMiniStatementEntry(
                        t, statement.getAccountNumber(), null);

                if (stored.isEmpty()) continue;
                newCount++;

                CoopTransaction tx = stored.get();

                // Credit savings for new CREDIT transactions where member was resolved
                if ("CR".equals(tx.getTransactionType())
                        && tx.getMemberId() != null
                        && !tx.isSavingsCredited()) {
                    try {
                        LocalDateTime valueDate =
                                tx.getValueDate() != null ? tx.getValueDate() : tx.getCreatedAt();

                        savingsService.processMpesaPaybillDeposit(
                                tx.getMemberId(),
                                tx.getAmount(),
                                tx.getMpesaRef(),
                                tx.getSenderPhone(),
                                valueDate);

                        tx.setSavingsCredited(true);
                        tx.setSavingsCreditedAt(LocalDateTime.now());
                        coopTransactionRepository.save(tx);
                        creditedCount++;

                        log.info("MiniStatementPollingJob: ✅ Savings credited — {} KES {} ref={}",
                                tx.getSenderName(), tx.getAmount(), tx.getMpesaRef());

                    } catch (Exception e) {
                        log.error("MiniStatementPollingJob: savings credit FAILED ref={} — {}",
                                tx.getMpesaRef(), e.getMessage(), e);
                    }
                }
            }

            if (newCount > 0 || creditedCount > 0) {
                log.info("MiniStatementPollingJob: {} new transaction(s) stored, {} savings credited.",
                        newCount, creditedCount);
            } else {
                log.debug("MiniStatementPollingJob: no new transactions.");
            }

        } catch (Exception e) {
            log.error("MiniStatementPollingJob failed: {}", e.getMessage(), e);
        }
    }
}