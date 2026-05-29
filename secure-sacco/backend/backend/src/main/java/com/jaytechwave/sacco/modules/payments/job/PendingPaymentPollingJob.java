package com.jaytechwave.sacco.modules.payments.job;

import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.TransactionStatusResponse;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentFailedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopConnectService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Polls Co-op Connect Transaction Status API every 10 seconds for PENDING STK push payments.
 *
 * Co-op Bank advised using the Transaction Status enquiry API to confirm payment
 * rather than relying solely on the STK callback/IPN delivery.
 *
 * On confirmation:
 * - transactionRef is set to the M-Pesa receipt (e.g. UETA45S0OJ) from Co-op's TransactionID
 * - senderName is set to the SACCO member's full name (account holder), not the M-Pesa phone owner
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PendingPaymentPollingJob {

    private final PaymentRepository        paymentRepository;
    private final CoopConnectService       coopConnectService;
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository           userRepository;

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
                && payment.getCreatedAt().isBefore(ZonedDateTime.now().minusMinutes(10))) {
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

        log.info("PendingPaymentPollingJob: ref={} → MessageCode={} Desc={} TxId={}",
                payment.getInternalRef(), status.getMessageCode(),
                status.getMessageDescription(), status.getTransactionId());

        // MessageCode "0" = transaction completed successfully
        if ("0".equals(status.getMessageCode())) {

            // Set the real M-Pesa receipt number as transactionRef (e.g. UETA45S0OJ)
            String mpesaRef = status.getTransactionId();
            payment.setTransactionRef(mpesaRef);

            // Set sender name = the SACCO member's full name (account holder)
            // NOT the M-Pesa phone owner — one can pay using someone else's phone
            if (payment.getMemberId() != null) {
                Optional<User> memberUser = userRepository.findByMemberId(payment.getMemberId());
                memberUser.ifPresent(user ->
                        payment.setSenderName(user.getFirstName() + " " + user.getLastName())
                );
            }

            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setProviderMetadata(
                    "{\"source\":\"poll\",\"messageCode\":\"0\",\"transactionId\":\"" + mpesaRef + "\"}"
            );
            paymentRepository.save(payment);

            log.info("PendingPaymentPollingJob: ✅ COMPLETED ref={} mpesaRef={} member={}",
                    payment.getInternalRef(), mpesaRef, payment.getSenderName());

            if (payment.getMemberId() != null) {
                eventPublisher.publishEvent(new PaymentCompletedEvent(
                        payment.getId(),
                        payment.getMemberId(),
                        payment.getAmount(),
                        payment.getAccountReference(),
                        mpesaRef != null ? mpesaRef : payment.getInternalRef()
                ));
            }

        } else if (isFailureCode(status.getMessageCode())) {
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
        // Any other code = still processing — leave PENDING, poll again next cycle
    }

    /**
     * Co-op STK failure codes:
     * 1032 = Request cancelled by user
     * 1037 = DS timeout user cannot be reached
     * 2001 = Wrong PIN
     * 1019 = Transaction expired
     * 1001 = Insufficient funds
     */
    private boolean isFailureCode(String code) {
        if (code == null) return false;
        return switch (code) {
            case "1032", "1037", "2001", "1019", "1001" -> true;
            default -> false;
        };
    }
}