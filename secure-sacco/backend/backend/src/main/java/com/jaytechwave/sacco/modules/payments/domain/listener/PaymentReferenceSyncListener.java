package com.jaytechwave.sacco.modules.payments.domain.listener;

import com.jaytechwave.sacco.modules.accounting.domain.repository.JournalEntryRepository;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentReceiptUpdatedEvent;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentReferenceSyncListener {

    private final SavingsTransactionRepository savingsTransactionRepository;
    private final JournalEntryRepository journalEntryRepository;

    @Order(org.springframework.core.Ordered.LOWEST_PRECEDENCE)
    @Async
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePaymentReceiptUpdated(PaymentReceiptUpdatedEvent event) {
        String internalRef = event.internalRef();
        String mpesaRef = event.receiptNumber();

        if (internalRef == null || internalRef.isBlank()) {
            return;
        }
        if (mpesaRef == null || mpesaRef.isBlank() || "Processing".equalsIgnoreCase(mpesaRef)) {
            return;
        }

        // Idempotency: if they are identical, there's nothing to update
        if (internalRef.equals(mpesaRef)) {
            return;
        }

        log.info("PaymentReferenceSyncListener: Synchronizing financial ledgers for payment {}. Updating reference {} -> {}", 
                event.paymentId(), internalRef, mpesaRef);

        try {
            // 1. Synchronize standard savings deposits (reference = internalRef)
            int savingsUpdated = savingsTransactionRepository.updateReference(internalRef, mpesaRef);
            
            // 2. Synchronize split savings deposits (reference = PRODUCT-{internalRef})
            int splitSavingsUpdated = savingsTransactionRepository.updateReference("PRODUCT-" + internalRef, "PRODUCT-" + mpesaRef);

            // 3. Synchronize journal entries with NO prefix (referenceNumber = internalRef)
            int journalsUpdated = journalEntryRepository.updateReferenceNumber(internalRef, mpesaRef);
            
            // 4. Synchronize journal entries with known prefixes
            String[] prefixes = {"PRODUCT-", "FEE-", "LNREP-", "PENREP-", "REG-", "DEP-"};
            int prefixedJournalsUpdated = 0;
            for (String prefix : prefixes) {
                prefixedJournalsUpdated += journalEntryRepository.updateReferenceNumber(prefix + internalRef, prefix + mpesaRef);
            }

            log.info("PaymentReferenceSyncListener: Synchronization complete. Updated {} standard savings, {} split savings, {} standard journals, {} prefixed journals.",
                    savingsUpdated, splitSavingsUpdated, journalsUpdated, prefixedJournalsUpdated);

        } catch (Exception e) {
            log.error("PaymentReferenceSyncListener: Failed to synchronize ledger references for payment {}. Error: {}", 
                    event.paymentId(), e.getMessage(), e);
        }
    }
}
