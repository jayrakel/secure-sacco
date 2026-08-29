package com.jaytechwave.sacco.modules.paymentproducts.domain.job;

import com.jaytechwave.sacco.modules.paymentproducts.domain.service.PaymentProductComplianceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentProductComplianceJob {

    private final PaymentProductComplianceService complianceService;

    // Run every day at 1:30 AM
    @Scheduled(cron = "0 30 1 * * *", zone = "Africa/Nairobi")
    public void evaluateCompliance() {
        log.info("Starting scheduled Payment Product Compliance Evaluation");
        try {
            complianceService.evaluateAll();
            log.info("Completed scheduled Payment Product Compliance Evaluation");
        } catch (Exception e) {
            log.error("Failed during scheduled Payment Product Compliance Evaluation", e);
        }
    }
}
