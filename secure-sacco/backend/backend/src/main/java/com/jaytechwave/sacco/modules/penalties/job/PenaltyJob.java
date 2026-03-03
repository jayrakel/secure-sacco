package com.jaytechwave.sacco.modules.penalties.job;

import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PenaltyJob {

    private final PenaltyService penaltyService;

    /**
     * Runs automatically every day at 00:30 AM server time.
     * Cron expression: "0 30 0 * * *" -> Second 0, Minute 30, Hour 0, Every day.
     */
    @Scheduled(cron = "0 30 0 * * *")
    public void executeDailyPenaltyInterestAccrual() {
        log.info("Starting Daily Penalty Interest Accrual Check...");
        try {
            penaltyService.processPenaltyInterestAccruals();
            log.info("Successfully completed Daily Penalty Interest Accrual Check.");
        } catch (Exception e) {
            log.error("Critical error during Daily Penalty Interest Accrual Check: {}", e.getMessage(), e);
        }
    }
}