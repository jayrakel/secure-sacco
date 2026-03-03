package com.jaytechwave.sacco.modules.loans.domain.listener;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentFailedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class LoanPaymentListener {

    private final LoanApplicationRepository loanApplicationRepository;
    private final JournalEntryService journalEntryService;

    @EventListener
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        if (event.accountReference() != null && event.accountReference().startsWith("LNFEE-")) {
            String appIdStr = event.accountReference().replace("LNFEE-", "");
            log.info("Loans Module Event: Processing Fee Payment for Application {}", appIdStr);

            try {
                UUID appId = UUID.fromString(appIdStr);
                loanApplicationRepository.findById(appId).ifPresent(app -> {
                    // IDEMPOTENCY CHECK: Only process if it is strictly waiting for a fee
                    if (app.getStatus() == LoanStatus.PENDING_FEE) {
                        app.setStatus(LoanStatus.PENDING_GUARANTORS);
                        app.setApplicationFeePaid(true);
                        app.setApplicationFeeReference(event.receiptNumber() != null ? event.receiptNumber() : event.accountReference());

                        loanApplicationRepository.save(app);

                        // Post Double-Entry Accounting Journal
                        journalEntryService.postLoanApplicationFee(
                                app.getMemberId(),
                                app.getApplicationFee(),
                                app.getApplicationFeeReference()
                        );
                        log.info("Successfully posted Application Fee journal and transitioned Application {} to PENDING_GUARANTORS", appId);
                    }
                });
            } catch (IllegalArgumentException e) {
                log.error("Invalid Loan Application ID in reference: {}", event.accountReference());
            }
        }
    }

    @EventListener
    public void handlePaymentFailed(PaymentFailedEvent event) {
        if (event.accountReference() != null && event.accountReference().startsWith("LNFEE-")) {
            log.warn("Loans Module Event: Fee payment FAILED for reference {}. Reason: {}", event.accountReference(), event.failureReason());
            // We leave the application in PENDING_FEE so the user can just try again.
        }
    }
}