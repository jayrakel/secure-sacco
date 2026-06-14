package com.jaytechwave.sacco.modules.savings.domain.listener;

import com.jaytechwave.sacco.modules.core.util.SaccoDateUtils;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentFailedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.CoopTransactionRepository;
import com.jaytechwave.sacco.modules.savings.domain.entity.TransactionStatus;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class SavingsPaymentListener {

    private final SavingsTransactionRepository savingsTransactionRepository;
    private final JournalEntryService          journalEntryService;
    private final SavingsService               savingsService;
    private final CoopTransactionRepository    coopTransactionRepository;

    @EventListener
    public void handlePaymentCompleted(PaymentCompletedEvent event) {

        // ── Route 1: STK savings deposit (member pressed "Deposit" in app) ────────
        // A PENDING SavingsTransaction was pre-created with ref "DEP-...".
        // Mark it POSTED — unless the IPN already beat us to it via the PAYBILL path,
        // in which case we void the PENDING duplicate to prevent double-crediting.
        if (event.accountReference() != null && event.accountReference().startsWith("DEP-")) {
            log.info("Savings Module: STK deposit confirmed for member={} ref={}",
                    event.memberId(), event.accountReference());

            savingsTransactionRepository.findByReference(event.accountReference()).ifPresent(tx -> {
                if (tx.getStatus() == TransactionStatus.PENDING) {

                    // Race-condition guard: if the Co-op IPN arrived before polling set
                    // mpesaRef on the Payment, the PAYBILL path may have already credited
                    // savings under the raw mpesaRef.  Detect this and void the duplicate.
                    String mpesaRef = event.receiptNumber();
                    if (mpesaRef != null && savingsTransactionRepository.existsByReference(mpesaRef)) {
                        log.warn("Savings Module: PAYBILL path already credited mpesaRef={} — " +
                                "voiding PENDING STK duplicate ref={}", mpesaRef, event.accountReference());
                        tx.setStatus(TransactionStatus.FAILED);
                        savingsTransactionRepository.save(tx);

                        // Ensure CoopTransaction is flagged as credited
                        coopTransactionRepository.findByMpesaRef(mpesaRef).ifPresent(ct -> {
                            if (!ct.isSavingsCredited()) {
                                ct.setSavingsCredited(true);
                                ct.setSavingsCreditedAt(LocalDateTime.now(SaccoDateUtils.NAIROBI));
                                coopTransactionRepository.save(ct);
                            }
                        });
                        return;
                    }

                    // Normal path: IPN hasn't credited yet — post the PENDING savings tx
                    // SAC-242: update reference from internal DEP-{uuid} to the actual
                    // M-Pesa ref so the POSTED savings transaction is traceable to the
                    // bank statement and the member's phone confirmation.
                    if (mpesaRef != null) {
                        tx.setReference(mpesaRef);
                    }
                    tx.setStatus(TransactionStatus.POSTED);
                    tx.setPostedAt(LocalDateTime.now(SaccoDateUtils.NAIROBI));
                    savingsTransactionRepository.save(tx);

                    journalEntryService.postSavingsTransaction(
                            event.memberId(),
                            event.amount(),
                            "DEPOSIT",
                            "MPESA",
                            event.receiptNumber() != null ? event.receiptNumber() : event.accountReference()
                    );
                }
            });

        // ── Route 2: Manual paybill deposit (member paid via M-Pesa paybill) ──────
        // No PENDING savings transaction was pre-created.  processMpesaPaybillDeposit
        // creates a new POSTED savings transaction + double-entry GL in one call.
        // The accountReference carries "PAYBILL-{mpesaRef}" so we can extract the ref.
        } else if (event.accountReference() != null
                && event.accountReference().startsWith("PAYBILL-")
                && event.memberId() != null) {

            String mpesaRef = event.accountReference().substring("PAYBILL-".length());
            log.info("Savings Module: Paybill deposit for member={} mpesaRef={}", event.memberId(), mpesaRef);

            try {
                LocalDateTime valueDate = coopTransactionRepository.findByMpesaRef(mpesaRef)
                        .map(ct -> ct.getValueDate() != null ? ct.getValueDate() : ct.getCreatedAt())
                        .orElse(LocalDateTime.now(SaccoDateUtils.NAIROBI));

                savingsService.processMpesaPaybillDeposit(
                        event.memberId(), event.amount(), mpesaRef, null, valueDate);

                // Mark the corresponding CoopTransaction as credited
                coopTransactionRepository.findByMpesaRef(mpesaRef).ifPresent(ct -> {
                    ct.setSavingsCredited(true);
                    ct.setSavingsCreditedAt(LocalDateTime.now(SaccoDateUtils.NAIROBI));
                    coopTransactionRepository.save(ct);
                });

            } catch (Exception e) {
                log.error("Savings Module: Paybill credit FAILED member={} mpesaRef={} — {}",
                        event.memberId(), mpesaRef, e.getMessage(), e);
            }
        }
    }

    @EventListener
    public void handlePaymentFailed(PaymentFailedEvent event) {
        if (event.accountReference() != null && event.accountReference().startsWith("DEP-")) {
            log.warn("Savings Module: STK deposit FAILED for member={} ref={}",
                    event.memberId(), event.accountReference());

            savingsTransactionRepository.findByReference(event.accountReference()).ifPresent(tx -> {
                if (tx.getStatus() == TransactionStatus.PENDING) {
                    tx.setStatus(TransactionStatus.FAILED);
                    savingsTransactionRepository.save(tx);
                }
            });
        }
    }
}