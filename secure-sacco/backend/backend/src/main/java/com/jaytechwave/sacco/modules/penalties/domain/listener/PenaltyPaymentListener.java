package com.jaytechwave.sacco.modules.penalties.domain.listener;

import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentFailedEvent;
import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyRepaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class PenaltyPaymentListener {

    private final PenaltyRepaymentService penaltyRepaymentService;

    @EventListener
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        if (event.accountReference() != null && event.accountReference().startsWith("PENREP-")) {
            String repIdStr = event.accountReference().replace("PENREP-", "");
            log.info("Penalties Module Event: Processing Penalty Repayment {}", repIdStr);
            try {
                penaltyRepaymentService.processCompletedRepayment(UUID.fromString(repIdStr), event.receiptNumber());
            } catch (Exception e) {
                log.error("Failed to allocate penalty repayment {}: {}", repIdStr, e.getMessage());
            }
        }
    }

    @EventListener
    public void handlePaymentFailed(PaymentFailedEvent event) {
        if (event.accountReference() != null && event.accountReference().startsWith("PENREP-")) {
            String repIdStr = event.accountReference().replace("PENREP-", "");
            log.warn("Penalties Module Event: Penalty Repayment FAILED for reference {}", event.accountReference());
            try {
                penaltyRepaymentService.processFailedRepayment(UUID.fromString(repIdStr));
            } catch (Exception e) {
                log.error("Failed to process failed penalty repayment {}: {}", repIdStr, e.getMessage());
            }
        }
    }
}