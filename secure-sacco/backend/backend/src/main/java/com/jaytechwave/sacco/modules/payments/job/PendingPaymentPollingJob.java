package com.jaytechwave.sacco.modules.payments.job;

import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.TransactionStatusResponse;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentFailedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopConnectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Polls Co-op Connect Transaction Status API every 30 seconds for PENDING STK push payments.
 *
 * Co-op Bank advised using the Transaction Status enquiry API to confirm payment
 * rather than relying solely on the STK callback/IPN delivery.
 *
 * Flow:
 *   1. Member initiates STK push → payment saved as PENDING
 *   2. Every 30 seconds this job queries Co-op for each PENDING payment
 *   3. If Co-op confirms success → mark COMPLETED → publish PaymentCompletedEvent
 *   4. If Co-op confirms failure → mark FAILED → publish PaymentFailedEvent
 *   5. If payment is older than 10 minutes and still pending → expire it
 *
 * Endpoint: POST /Enquiry/STK/1.0.0/
 * Response codes: "0" = success, anything else = failure/pending
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PendingPaymentPollingJob {

    private final PaymentRepository       paymentRepository;
    private final CoopConnectService      coopConnectService;
    private final ApplicationEventPublisher eventPublisher;

    // Poll every 10 seconds
    @Scheduled(fixedDelay = 10_000)
    @Transactional
    public void pollPendingPayments() {
        List<Payment> pending = paymentRepository.findByStatusAndPaymentType(
                PaymentStatus.PENDING, "STK_PUSH"
        );

        if (pending.isEmpty()) return;

        log.info("PendingPaymentPollingJob: checking {} PENDING STK payment(s)", pending.size());

        for (Payment payment : pending) {
            try {
                processSinglePayment(payment);
            } catch (Exception e) {
                log.warn("PendingPaymentPollingJob: error checking payment ref={} — {}",
                        payment.getInternalRef(), e.getMessage());
            }
        }
    }

    private void processSinglePayment(Payment payment) {
        // Expire payments older than 10 minutes
        if (payment.getCreatedAt() != null
                && payment.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(10))) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Payment expired — no confirmation received within 10 minutes");
            paymentRepository.save(payment);
            log.warn("PendingPaymentPollingJob: payment ref={} expired", payment.getInternalRef());

            if (payment.getMemberId() != null) {
                eventPublisher.publishEvent(new PaymentFailedEvent(
                        payment.getId(), payment.getMemberId(), payment.getAmount(),
                        payment.getAccountReference(), "Payment expired"
                ));
            }
            return;
        }

        // Query Co-op for transaction status
        TransactionStatusResponse status = coopConnectService.checkTransactionStatus(
                payment.getInternalRef()
        );

        if (status == null) {
            log.debug("PendingPaymentPollingJob: null response for ref={}", payment.getInternalRef());
            return;
        }

        log.info("PendingPaymentPollingJob: ref={} → MessageCode={} Desc={}",
                payment.getInternalRef(), status.getMessageCode(), status.getMessageDescription());

        // MessageCode "0" = transaction completed successfully
        if ("0".equals(status.getMessageCode())) {
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setTransactionRef(status.getTransactionId());
            payment.setProviderMetadata(
                    "{\"source\":\"poll\",\"messageCode\":\"" + status.getMessageCode()
                            + "\",\"transactionId\":\"" + status.getTransactionId() + "\"}"
            );
            paymentRepository.save(payment);

            log.info("PendingPaymentPollingJob: ✅ COMPLETED ref={} txId={}",
                    payment.getInternalRef(), status.getTransactionId());

            if (payment.getMemberId() != null) {
                eventPublisher.publishEvent(new PaymentCompletedEvent(
                        payment.getId(),
                        payment.getMemberId(),
                        payment.getAmount(),
                        payment.getAccountReference(),
                        status.getTransactionId() != null
                                ? status.getTransactionId() : payment.getInternalRef()
                ));
            }

        } else if (isFailureCode(status.getMessageCode())) {
            // Known failure codes from Co-op
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(status.getMessageDescription());
            paymentRepository.save(payment);

            log.warn("PendingPaymentPollingJob: ❌ FAILED ref={} reason={}",
                    payment.getInternalRef(), status.getMessageDescription());

            if (payment.getMemberId() != null) {
                eventPublisher.publishEvent(new PaymentFailedEvent(
                        payment.getId(), payment.getMemberId(), payment.getAmount(),
                        payment.getAccountReference(), status.getMessageDescription()
                ));
            }
        }
        // Any other code = still processing — leave as PENDING, poll again next cycle
    }

    /**
     * Co-op failure codes:
     * 1032 = Request cancelled by user
     * 1037 = DS timeout user cannot be reached
     * 2001 = Wrong PIN
     * 1019 = Transaction expired
     */
    private boolean isFailureCode(String code) {
        if (code == null) return false;
        return switch (code) {
            case "1032", "1037", "2001", "1019", "1001" -> true;
            default -> false;
        };
    }
}