package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.*;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentFailedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final CoopConnectService      coopConnectService;
    private final PaymentRepository       paymentRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SecurityAuditService    securityAuditService;

    // ── STK Push initiation ───────────────────────────────────────────────────

    @Transactional
    public InitiateStkResponse initiateMpesaStkPush(InitiateStkRequest request, UUID memberId) {

        // Normalise phone to 2547XXXXXXXX
        String phone = request.phoneNumber().replaceAll("\\s+", "");
        if (phone.startsWith("+")) {
            phone = phone.substring(1);
        } else if (phone.startsWith("0")) {
            phone = "254" + phone.substring(1);
        }

        // Each STK push needs a unique MessageReference
        String messageRef = UUID.randomUUID().toString().replace("-", "").substring(0, 20);

        StkPushResponse coopResponse = coopConnectService.initiateStkPush(
                phone, request.amount(), messageRef, "BETTER LINK VENTURES SACCO"
        );

        if (coopResponse == null) {
            throw new RuntimeException("Co-op Connect returned no response to STK Push");
        }

        // MessageCode "0" = success for Co-op Connect
        boolean success = "0".equals(coopResponse.getMessageCode());
        if (!success) {
            throw new RuntimeException("Co-op STK Push failed: " + coopResponse.getMessageDescription());
        }

        Payment payment = Payment.builder()
                .memberId(memberId)
                .internalRef(messageRef)          // Co-op MessageReference is our tracking key
                .amount(request.amount())
                .paymentMethod("MPESA_COOP")
                .paymentType("STK_PUSH")
                .accountReference(request.accountReference())
                .senderPhoneNumber(phone)
                .status(PaymentStatus.PENDING)
                .build();

        paymentRepository.save(payment);

        securityAuditService.logEvent(
                "STK_PUSH_INITIATED", memberId != null ? memberId.toString() : "UNKNOWN",
                "Co-op STK push of KES " + request.amount() + " initiated. Ref: " + messageRef
        );

        return new InitiateStkResponse(
                "STK Push initiated. Please check your phone.",
                messageRef,
                "Enter your M-Pesa PIN on your phone to complete the payment."
        );
    }

    // ── STK Callback (Co-op posts to /coop/stk-callback) ─────────────────────

    @Transactional
    public void processStkCallback(String rawJson, StkCallbackPayload callback) {
        String messageRef = callback.getMessageReference();

        Payment payment = paymentRepository.findByInternalRef(messageRef)
                .orElseThrow(() -> new RuntimeException(
                        "Payment not found for MessageReference: " + messageRef));

        // Idempotency: skip if already terminal
        if (payment.getStatus() == PaymentStatus.COMPLETED
                || payment.getStatus() == PaymentStatus.FAILED) {
            log.info("Payment {} already in terminal state. Skipping.", messageRef);
            return;
        }

        payment.setProviderMetadata(rawJson);

        // Co-op success code is "0"
        boolean success = "0".equals(callback.getMessageCode());

        if (success) {
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setTransactionRef(callback.getTransactionId());
            paymentRepository.save(payment);

            log.info("Co-op STK payment SUCCESS. TransactionID={}", callback.getTransactionId());

            securityAuditService.logEvent(
                    "PAYMENT_RECEIVED",
                    payment.getMemberId() != null ? payment.getMemberId().toString() : "UNKNOWN",
                    "Co-op M-Pesa payment of KES " + payment.getAmount()
                            + " confirmed. TxID: " + callback.getTransactionId()
                            + ". Ref: " + payment.getAccountReference()
            );

            if (payment.getMemberId() != null) {
                eventPublisher.publishEvent(new PaymentCompletedEvent(
                        payment.getId(), payment.getMemberId(), payment.getAmount(),
                        payment.getAccountReference(),
                        callback.getTransactionId() != null
                                ? callback.getTransactionId() : messageRef
                ));
            }

        } else {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(callback.getMessageDescription());
            paymentRepository.save(payment);

            log.warn("Co-op STK payment FAILED. Reason={}", callback.getMessageDescription());

            if (payment.getMemberId() != null) {
                eventPublisher.publishEvent(new PaymentFailedEvent(
                        payment.getId(), payment.getMemberId(), payment.getAmount(),
                        payment.getAccountReference(), callback.getMessageDescription()
                ));
            }
        }
    }

    // ── B2B IPN (Co-op CBS posts when member pays to paybill manually) ────────

    @Transactional
    public void processCoopIpn(String rawJson, CoopIpnPayload ipn) {
        // Only process CREDIT events
        if (!"CREDIT".equalsIgnoreCase(ipn.getEventType())) {
            log.info("Co-op IPN: ignoring non-CREDIT event '{}' for AcctNo={}", ipn.getEventType(), ipn.getAcctNo());
            return;
        }

        // Idempotency: one payment per TransactionId
        String txId = ipn.getTransactionId();
        if (paymentRepository.findByTransactionRef(txId).isPresent()) {
            log.info("Co-op IPN: duplicate TransactionId={} — skipping", txId);
            return;
        }

        BigDecimal amount;
        try {
            amount = new BigDecimal(ipn.getAmount());
        } catch (NumberFormatException e) {
            log.error("Co-op IPN: invalid amount '{}' for TxId={}", ipn.getAmount(), txId);
            return;
        }

        // Extract phone from CustMemoLine1 (format: "TIP6V5IRAE~254707919065~0")
        String phone = extractPhone(ipn.getCustMemoLine1());
        // Extract sender name from CustMemoLine3 (format: "0200~MELVIN WANJIKU")
        String senderName = extractSenderName(ipn.getCustMemoLine3());

        Payment payment = Payment.builder()
                .transactionRef(txId)
                .internalRef("IPN-" + txId)
                .amount(amount)
                .paymentMethod("MPESA_COOP_IPN")
                .paymentType("PAYBILL_DEPOSIT")
                .senderPhoneNumber(phone)
                .senderName(senderName)
                .accountReference(ipn.getPaymentRef())
                .status(PaymentStatus.COMPLETED)
                .providerMetadata(rawJson)
                .build();

        paymentRepository.save(payment);

        log.info("Co-op IPN: CREDIT KES {} from {} ({}). PaymentRef={} TxId={}",
                amount, senderName, phone, ipn.getPaymentRef(), txId);

        securityAuditService.logEvent(
                "IPN_PAYMENT_RECEIVED", "COOP_IPN",
                "Co-op IPN credit KES " + amount + " from " + senderName
                        + " (" + phone + "). TxId: " + txId
        );

        // Publish event so SavingsPaymentListener / LoanRepaymentService can pick it up
        eventPublisher.publishEvent(new PaymentCompletedEvent(
                payment.getId(), null, amount, ipn.getPaymentRef(), txId
        ));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Extracts phone number from CustMemoLine1.
     * Format: "TIP6V5IRAE~254707919065~0" → "254707919065"
     */
    private String extractPhone(String memoLine1) {
        if (memoLine1 == null) return null;
        String[] parts = memoLine1.split("~");
        return parts.length >= 2 ? parts[1].trim() : null;
    }

    /**
     * Extracts sender name from CustMemoLine3.
     * Format: "0200~MELVIN WANJIKU" → "MELVIN WANJIKU"
     */
    private String extractSenderName(String memoLine3) {
        if (memoLine3 == null) return null;
        String[] parts = memoLine3.split("~");
        return parts.length >= 2 ? parts[1].trim() : null;
    }
}