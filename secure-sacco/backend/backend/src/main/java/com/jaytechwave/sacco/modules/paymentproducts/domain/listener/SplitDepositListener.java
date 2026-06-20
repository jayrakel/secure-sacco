package com.jaytechwave.sacco.modules.paymentproducts.domain.listener;

import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.service.DepositAllocationRouterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Handles the member-driven "split deposit" flow (SAC-261): a single STK push whose
 * proceeds are divided across multiple {@code payment_products}. Triggered only when
 * {@code accountReference} starts with {@code SPLIT-} — set at initiation time instead
 * of the regular {@code DEP-} prefix so {@link com.jaytechwave.sacco.modules.savings.domain.listener.SavingsPaymentListener}
 * skips it entirely and this listener owns the full routing.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SplitDepositListener {

    private final PaymentRepository                paymentRepository;
    private final DepositAllocationRouterService   routerService;

    @EventListener
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        if (event.accountReference() == null || !event.accountReference().startsWith("SPLIT-")) return;

        log.info("Split deposit confirmed for member={} paymentId={} ref={}",
                event.memberId(), event.paymentId(), event.accountReference());

        Payment payment = paymentRepository.findById(event.paymentId()).orElse(null);
        if (payment == null) {
            log.error("Split deposit routing: payment {} not found", event.paymentId());
            return;
        }
        // Use the confirmed mpesaRef for per-allocation references, not the internal SPLIT- ref.
        if (payment.getMpesaRef() == null && event.receiptNumber() != null) {
            payment.setMpesaRef(event.receiptNumber());
            paymentRepository.save(payment);
        }

        routerService.routeAllocations(payment);
    }
}