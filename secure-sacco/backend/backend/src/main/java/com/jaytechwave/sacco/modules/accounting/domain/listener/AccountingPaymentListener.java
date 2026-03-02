package com.jaytechwave.sacco.modules.accounting.domain.listener;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AccountingPaymentListener {

    private final JournalEntryService journalEntryService;

    @EventListener
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        if (event.accountReference() != null && event.accountReference().startsWith("REG-")) {
            log.info("Accounting Module Event Received: Posting Registration Fee Journal for {}", event.memberId());
            journalEntryService.postRegistrationFeeTemplate(
                    event.memberId(),
                    event.amount(),
                    event.receiptNumber()
            );
        }
    }
}