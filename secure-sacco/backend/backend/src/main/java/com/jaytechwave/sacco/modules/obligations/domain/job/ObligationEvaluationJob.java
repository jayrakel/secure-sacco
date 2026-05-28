package com.jaytechwave.sacco.modules.obligations.domain.job;

import com.jaytechwave.sacco.modules.obligations.domain.service.ObligationPeriodService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled trigger for obligation evaluation.
 *
 * <p>Runs daily at 01:00 AM. The evaluation logic inside {@link ObligationPeriodService}
 * handles checking exact due dates and grace periods dynamically.</p>
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

    /** * 🟢 THE FIX: Runs EVERY NIGHT at 01:00 AM.
     * The evaluation logic will now dynamically check if the (DueDate + Grace Period) has passed.
     */
    @Scheduled(cron = "0 0 1 * * *")
    public void evaluateDaily() {
        log.info("ObligationEvaluationJob: Daily compliance trigger fired.");
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