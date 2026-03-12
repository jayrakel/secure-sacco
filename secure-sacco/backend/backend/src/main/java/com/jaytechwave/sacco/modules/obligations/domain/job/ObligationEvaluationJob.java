package com.jaytechwave.sacco.modules.obligations.job;

import com.jaytechwave.sacco.modules.obligations.domain.service.ObligationPeriodService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled trigger for obligation evaluation.
 *
 * <p>Runs at 01:00 on every Monday (weekly obligations) and at 01:00 on the
 * 1st of every month (monthly obligations). The service itself is idempotent
 * so running both crons on the 1st-of-month Monday is harmless.</p>
 *
 * <p>The actual evaluation logic lives in {@link ObligationPeriodService}
 * so it can be unit-tested and triggered manually via
 * {@code POST /api/v1/obligations/evaluate}.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ObligationEvaluationJob {

    private final ObligationPeriodService obligationPeriodService;

    /** Every Monday at 01:00 — catches weekly obligations */
    @Scheduled(cron = "0 0 1 * * MON")
    public void evaluateWeekly() {
        log.info("ObligationEvaluationJob: weekly trigger fired.");
        runEvaluation();
    }

    /** 1st of every month at 01:00 — catches monthly obligations */
    @Scheduled(cron = "0 0 1 1 * *")
    public void evaluateMonthly() {
        log.info("ObligationEvaluationJob: monthly trigger fired.");
        runEvaluation();
    }

    private void runEvaluation() {
        try {
            obligationPeriodService.evaluateAll();
        } catch (Exception e) {
            log.error("ObligationEvaluationJob: unexpected top-level error: {}", e.getMessage(), e);
        }
    }
}