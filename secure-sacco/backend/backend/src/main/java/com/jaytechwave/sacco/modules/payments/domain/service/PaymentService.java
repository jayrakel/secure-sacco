package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.*;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final CoopConnectService      coopConnectService;
    private final PaymentRepository       paymentRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SecurityAuditService    securityAuditService;
    private final CoopEventNormalizer     coopEventNormalizer;

    // ── STK Push initiation ───────────────────────────────────────────────────

    @Transactional
    public InitiateStkResponse initiateMpesaStkPush(InitiateStkRequest request, UUID memberId) {
        String phone = normalisePhone(request.phoneNumber());
        String messageRef = UUID.randomUUID().toString().replace("-", "").substring(0, 20);

        StkPushResponse coopResponse = coopConnectService.initiateStkPush(
                phone, request.amount(), messageRef, "BETTER LINK VENTURES SACCO"
        );

        if (coopResponse == null) {
            throw new RuntimeException("Co-op Connect returned no response to STK Push");
        }
        if (!"0".equals(coopResponse.getMessageCode())) {
            throw new RuntimeException("Co-op STK Push failed: " + coopResponse.getMessageDescription());
        }

        Payment payment = Payment.builder()
                .memberId(memberId)
                .internalRef(messageRef)
                .amount(request.amount())
                .paymentMethod("MPESA_COOP")
                .paymentType("STK_PUSH")
                .accountReference(request.accountReference())
                .senderPhoneNumber(phone)
                .status(PaymentStatus.PENDING)
                .build();

        paymentRepository.save(payment);

        securityAuditService.logEvent(
                "STK_PUSH_INITIATED",
                memberId != null ? memberId.toString() : "UNKNOWN",
                "Co-op STK push of KES " + request.amount() + " initiated. Ref: " + messageRef
        );

        return new InitiateStkResponse(
                "STK Push initiated. Please check your phone.",
                messageRef,
                "Enter your M-Pesa PIN on your phone to complete the payment."
        );
    }

    // ── STK Callback (kept for forward compatibility — Co-op may use it) ─────

    @Transactional
    public void processStkCallback(String rawJson, StkCallbackPayload callback) {
        // Run normalizer first to enrich the phone to member link
        Optional<CoopTransaction> coopTxOpt = coopEventNormalizer.normalizeStkCallback(callback, rawJson);
        String messageRef = callback.getMessageReference();

        Optional<Payment> paymentOpt = paymentRepository.findByInternalRef(messageRef);
        if (paymentOpt.isEmpty()) {
            log.warn("STK Callback: no payment found for MessageReference={}. " +
                    "Co-op may be routing this through the IPN instead.", messageRef);
            return;
        }

        Payment payment = paymentOpt.get();
        if (payment.getStatus() == PaymentStatus.COMPLETED
                || payment.getStatus() == PaymentStatus.FAILED) {
            log.info("Payment {} already in terminal state. Skipping.", messageRef);
            return;
        }

        payment.setProviderMetadata(rawJson);
        boolean success = "0".equals(callback.getMessageCode());

        if (success) {
            // Set M-Pesa receipt as the main reference
            payment.setMpesaRef(callback.getTransactionId());
            
            // Enrich with correct member details if the normalizer successfully matched the phone
            if (coopTxOpt.isPresent()) {
                if (coopTxOpt.get().getSenderName() != null) {
                    payment.setSenderName(coopTxOpt.get().getSenderName());
                }
                if (coopTxOpt.get().getSenderPhone() != null) {
                    payment.setSenderPhoneNumber(coopTxOpt.get().getSenderPhone());
                }
            }
            markCompleted(payment, callback.getTransactionId(), rawJson);
        } else {
            markFailed(payment, callback.getMessageDescription());
        }
    }

    // ── B2B IPN — handles ALL Co-op payment notifications ────────────────────

    @Transactional
    public void processCoopIpn(String rawJson, CoopIpnPayload ipn) {
        boolean isCredit = "CREDIT".equalsIgnoreCase(ipn.getEventType());
        boolean isDebit  = "DEBIT".equalsIgnoreCase(ipn.getEventType());

        if (!isCredit && !isDebit) {
            log.info("Co-op IPN: ignoring unknown event type '{}' for AcctNo={}",
                    ipn.getEventType(), ipn.getAcctNo());
            return;
        }

        // Idempotency: one record per TransactionId
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

        // ── ENRICHMENT BLOCK ─────────────────────────────────────────────
        // We run the normalizer first to extract the clean M-Pesa receipt, 
        // the validated phone number, and the true member's name.
        Optional<CoopTransaction> coopTxOpt = coopEventNormalizer.normalizeIpn(ipn, rawJson);

        String phone      = extractPhone(ipn.getCustMemoLine1()); // Bank fallback
        String senderName = extractSenderName(ipn.getCustMemoLine3()); // Bank fallback
        String mpesaRef   = null;

        if (coopTxOpt.isPresent()) {
            CoopTransaction ctx = coopTxOpt.get();
            mpesaRef = ctx.getMpesaRef();
            if (ctx.getSenderPhone() != null) phone = ctx.getSenderPhone();
            if (ctx.getSenderName() != null) senderName = ctx.getSenderName();
        } else {
            // Fallback just in case normalizer hit a duplication block
            String narration = ipn.getNarration() != null ? ipn.getNarration() : "";
            String[] parts   = narration.split("~");
            mpesaRef  = parts.length > 0 ? parts[0].trim() : txId;
        }
        // ─────────────────────────────────────────────────────────────────

        String txType = isCredit ? "CR" : "DR";

        log.info("Co-op IPN: {} KES {} — {} ({}). PaymentRef={} TxId={} MpesaRef={}",
                txType, amount, senderName, phone, ipn.getPaymentRef(), txId, mpesaRef);

        if (isCredit) {
            // ── Try to match to a pending STK push payment ─────────────────
            Payment payment = null;
            if (phone != null) {
                List<Payment> pending = paymentRepository
                        .findBySenderPhoneNumberAndStatus(phone, PaymentStatus.PENDING);
                if (!pending.isEmpty()) {
                    payment = pending.get(0);
                    log.info("Co-op IPN: matched to pending STK payment id={} ref={}",
                            payment.getId(), payment.getInternalRef());
                }
            }

            if (payment != null) {
                payment.setTransactionRef(txId);
                payment.setMpesaRef(mpesaRef); // Save Mpesa ref here!
                payment.setProviderMetadata(rawJson);
                payment.setSenderName(senderName); // Replace with mapped member name!
                payment.setTransactionType("CR");
                markCompleted(payment, txId, rawJson);
            } else {
                // New record — manual paybill payment
                payment = Payment.builder()
                        .transactionRef(txId)
                        .internalRef("IPN-" + txId)
                        .mpesaRef(mpesaRef) // Save Mpesa ref here!
                        .amount(amount)
                        .paymentMethod("MPESA_COOP_IPN")
                        .paymentType("PAYBILL_DEPOSIT")
                        .transactionType("CR")
                        .senderPhoneNumber(phone)
                        .senderName(senderName) // Mapped member name!
                        .accountReference(ipn.getPaymentRef())
                        .status(PaymentStatus.COMPLETED)
                        .providerMetadata(rawJson)
                        .build();

                paymentRepository.save(payment);
                log.info("Co-op IPN: new CREDIT KES {} from {} saved.", amount, senderName);

                securityAuditService.logEvent(
                        "IPN_PAYMENT_RECEIVED", "COOP_IPN",
                        "Co-op IPN credit KES " + amount + " from " + senderName
                                + " (" + phone + "). TxId: " + txId
                );

                eventPublisher.publishEvent(new PaymentCompletedEvent(
                        payment.getId(), null, amount, ipn.getPaymentRef(), txId
                ));
            }
        } else {
            // ── DEBIT — money going out of SACCO account ───────────────────
            Payment payment = Payment.builder()
                    .transactionRef(txId)
                    .internalRef("IPN-DR-" + txId)
                    .mpesaRef(mpesaRef)
                    .amount(amount)
                    .paymentMethod("COOP_DEBIT")
                    .paymentType("ACCOUNT_DEBIT")
                    .transactionType("DR")
                    .senderName(senderName)
                    .senderPhoneNumber(phone)
                    .accountReference(ipn.getPaymentRef())
                    .status(PaymentStatus.COMPLETED)
                    .providerMetadata(rawJson)
                    .build();

            paymentRepository.save(payment);
            log.info("Co-op IPN: new DEBIT KES {} — {} saved.", amount, ipn.getNarration());

            securityAuditService.logEvent(
                    "IPN_DEBIT_RECEIVED", "COOP_IPN",
                    "Co-op IPN debit KES " + amount + ". Narration: "
                            + ipn.getNarration() + ". TxId: " + txId
            );
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void markCompleted(Payment payment, String transactionId, String rawJson) {
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setTransactionRef(transactionId);
        payment.setProviderMetadata(rawJson);
        paymentRepository.save(payment);

        log.info("Co-op payment COMPLETED. TxId={} memberId={}",
                transactionId, payment.getMemberId());

        securityAuditService.logEvent(
                "PAYMENT_RECEIVED",
                payment.getMemberId() != null ? payment.getMemberId().toString() : "UNKNOWN",
                "Co-op M-Pesa payment of KES " + payment.getAmount()
                        + " confirmed. TxID: " + transactionId
        );

        eventPublisher.publishEvent(new PaymentCompletedEvent(
                payment.getId(),
                payment.getMemberId(),
                payment.getAmount(),
                payment.getAccountReference(),
                transactionId != null ? transactionId : payment.getInternalRef()
        ));
    }

    private void markFailed(Payment payment, String reason) {
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(reason);
        paymentRepository.save(payment);
        log.warn("Co-op payment FAILED. Reason={}", reason);

        if (payment.getMemberId() != null) {
            eventPublisher.publishEvent(new PaymentFailedEvent(
                    payment.getId(), payment.getMemberId(),
                    payment.getAmount(), payment.getAccountReference(), reason
            ));
        }
    }

    private String normalisePhone(String raw) {
        String phone = raw.replaceAll("\\s+", "");
        if (phone.startsWith("+"))  return phone.substring(1);
        if (phone.startsWith("0"))  return "254" + phone.substring(1);
        return phone;
    }

    private String extractPhone(String memoLine1) {
        if (memoLine1 == null) return null;
        String[] parts = memoLine1.split("~");
        return parts.length >= 2 ? parts[1].trim() : null;
    }

    private String extractSenderName(String memoLine3) {
        if (memoLine3 == null) return null;
        String[] parts = memoLine3.split("~");
        return parts.length >= 2 ? parts[1].trim() : null;
    }
}