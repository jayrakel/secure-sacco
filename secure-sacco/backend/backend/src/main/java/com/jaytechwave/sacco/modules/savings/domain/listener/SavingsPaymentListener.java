package com.jaytechwave.sacco.modules.savings.domain.listener;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentFailedEvent;
import com.jaytechwave.sacco.modules.savings.domain.entity.TransactionStatus;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
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
    private final JournalEntryService journalEntryService;

    @EventListener
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        // Only react to events meant for Savings Deposits (DEP-)
        if (event.accountReference() != null && event.accountReference().startsWith("DEP-")) {
            log.info("Savings Module Event: Processing MPESA Deposit for {}", event.memberId());

            savingsTransactionRepository.findByReference(event.accountReference()).ifPresent(tx -> {
                if (tx.getStatus() == TransactionStatus.PENDING) {
                    tx.setStatus(TransactionStatus.POSTED);
                    tx.setPostedAt(LocalDateTime.now());
                    savingsTransactionRepository.save(tx);

                    // Post Double-Entry Accounting
                    journalEntryService.postSavingsTransaction(
                            event.memberId(),
                            event.amount(),
                            "DEPOSIT",
                            "MPESA",
                            event.receiptNumber() != null ? event.receiptNumber() : event.accountReference()
                    );
                }
            });
        }
    }

    @EventListener
    public void handlePaymentFailed(PaymentFailedEvent event) {
        if (event.accountReference() != null && event.accountReference().startsWith("DEP-")) {
            log.warn("Savings Module Event: Failed MPESA Deposit for {}", event.memberId());

            savingsTransactionRepository.findByReference(event.accountReference()).ifPresent(tx -> {
                if (tx.getStatus() == TransactionStatus.PENDING) {
                    tx.setStatus(TransactionStatus.FAILED);
                    savingsTransactionRepository.save(tx);
                }
            });
        }
    }
}