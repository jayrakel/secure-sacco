package com.jaytechwave.sacco.modules.payments.job;

import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.MiniStatementResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.TransactionEntry;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopConnectService;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopEventNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Polls Co-op Bank mini-statement every 15 minutes.
 * Each transaction passes through {@link CoopEventNormalizer} which:
 *  - Extracts M-Pesa ref, phone, amount from the narration
 *  - Resolves phone → member name via all phone formats
 *  - Stores a clean record in coop_transactions (deduplicated)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MiniStatementPollingJob {

    private final CoopConnectService  coopConnectService;
    private final CoopEventNormalizer coopEventNormalizer;

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

            int newCount = 0;
            for (TransactionEntry t : statement.getTransactions()) {
                var stored = coopEventNormalizer.normalizeMiniStatementEntry(
                        t, statement.getAccountNumber(), null);
                if (stored.isPresent()) newCount++;
            }

            if (newCount > 0) {
                log.info("MiniStatementPollingJob: {} new transaction(s) stored.", newCount);
            } else {
                log.debug("MiniStatementPollingJob: no new transactions.");
            }

        } catch (Exception e) {
            log.error("MiniStatementPollingJob failed: {}", e.getMessage(), e);
        }
    }
}