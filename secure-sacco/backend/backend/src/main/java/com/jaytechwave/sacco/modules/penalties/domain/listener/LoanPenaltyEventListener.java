package com.jaytechwave.sacco.modules.penalties.domain.listener;

import com.jaytechwave.sacco.modules.loans.domain.event.LoanInstallmentOverdueEvent;
import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class LoanPenaltyEventListener {

    private final PenaltyService penaltyService;

    @EventListener
    public void onLoanInstallmentOverdue(LoanInstallmentOverdueEvent event) {
        log.info("Penalties Module caught Overdue Event for Schedule Item: {}", event.scheduleItemId());
        try {
            penaltyService.applyMissedInstallmentPenalty(event);
        } catch (Exception e) {
            log.error("Failed to apply missed installment penalty: {}", e.getMessage(), e);
        }
    }
}