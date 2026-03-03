package com.jaytechwave.sacco.modules.loans.job;

import com.jaytechwave.sacco.modules.loans.domain.service.LoanScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class LoanScheduleJob {

    private final LoanScheduleService loanScheduleService;

    /**
     * Runs automatically every day at 00:01 AM server time.
     * Cron expression: "0 1 0 * * *" -> Second 0, Minute 1, Hour 0, Every day.
     */
    @Scheduled(cron = "0 1 0 * * *")
    public void executeDailyScheduleCheck() {
        log.info("Starting Daily Loan Schedule Engine Check...");
        try {
            loanScheduleService.processPastDueInstallments();
            log.info("Successfully completed Daily Loan Schedule Engine Check.");
        } catch (Exception e) {
            log.error("Critical error during Daily Loan Schedule Engine Check: {}", e.getMessage(), e);
        }
    }
}