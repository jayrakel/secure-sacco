package com.jaytechwave.sacco.modules.savings.domain.listener;

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
        // A PENDING SavingsTransaction was pre-created with ref "DEP-..." when the
        // STK push was initiated. Mark it POSTED and record the GL entry.
        if (event.accountReference() != null && event.accountReference().startsWith("DEP-")) {
            log.info("Savings Module: STK deposit confirmed for member={} ref={}",
                    event.memberId(), event.accountReference());

            savingsTransactionRepository.findByReference(event.accountReference()).ifPresent(tx -> {
                if (tx.getStatus() == TransactionStatus.PENDING) {
                    tx.setStatus(TransactionStatus.POSTED);
                    tx.setPostedAt(LocalDateTime.now());
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
                savingsService.processMpesaPaybillDeposit(
                        event.memberId(), event.amount(), mpesaRef, null);

                // Mark the corresponding CoopTransaction as credited
                coopTransactionRepository.findByMpesaRef(mpesaRef).ifPresent(ct -> {
                    ct.setSavingsCredited(true);
                    ct.setSavingsCreditedAt(LocalDateTime.now());
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