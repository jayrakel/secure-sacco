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
import com.jaytechwave.sacco.modules.payments.domain.repository.CoopTransactionRepository;
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
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final CoopConnectService        coopConnectService;
    private final PaymentRepository         paymentRepository;
    private final CoopTransactionRepository coopTransactionRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SecurityAuditService      securityAuditService;
    private final CoopEventNormalizer       coopEventNormalizer;
    private final JournalEntryService       journalEntryService;

    // ── STK Push initiation ───────────────────────────────────────────────────

    @Transactional
    public InitiateStkResponse initiateMpesaStkPush(InitiateStkRequest request, UUID memberId) {
        String phone = normalisePhone(request.phoneNumber());
        String messageRef = UUID.randomUUID().toString().replace("-", "").substring(0, 20);

        // SAC-257: Force a fresh OAuth token before each STK push.
        // Co-op's token carries the operator profile's permitted operations.
        // If STK push was activated after our token was issued, the cached token
        // predates that activation and will fail. Always fetch fresh for STK.
        coopConnectService.invalidateTokenCache();

        StkPushResponse coopResponse = coopConnectService.initiateStkPush(
                phone, request.amount(), request.accountReference(),
                "BETTER LINK VENTURES SACCO",
                request.accountReference()   // member's DEP-xxx ref as AccountRef
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
            payment.setMpesaRef(callback.getTransactionId());
            if (coopTxOpt.isPresent()) {
                if (coopTxOpt.get().getSenderName()  != null) payment.setSenderName(coopTxOpt.get().getSenderName());
                if (coopTxOpt.get().getSenderPhone() != null) payment.setSenderPhoneNumber(coopTxOpt.get().getSenderPhone());
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

        // ── ENRICHMENT BLOCK ──────────────────────────────────────────────────
        // Normalizer runs first to resolve: clean M-Pesa receipt, validated phone,
        // true sender name, and — critically — the matched member UUID.
        Optional<CoopTransaction> coopTxOpt = coopEventNormalizer.normalizeIpn(ipn, rawJson);

        String phone      = extractPhone(ipn.getCustMemoLine1());       // bank fallback
        String senderName = extractSenderName(ipn.getCustMemoLine3()); // bank fallback
        String mpesaRef   = null;

        if (coopTxOpt.isPresent()) {
            CoopTransaction ctx = coopTxOpt.get();
            mpesaRef = ctx.getMpesaRef();
            if (ctx.getSenderPhone() != null) phone      = ctx.getSenderPhone();
            if (ctx.getSenderName()  != null) senderName = ctx.getSenderName();
        } else {
            String narration = ipn.getNarration() != null ? ipn.getNarration() : "";
            String[] parts   = narration.split("~");
            mpesaRef = parts.length > 0 ? parts[0].trim() : txId;
        }
        // ─────────────────────────────────────────────────────────────────────

        // Member resolved by the normalizer (null if phone not in system)
        UUID resolvedMemberId = coopTxOpt.map(CoopTransaction::getMemberId).orElse(null);

        // Secondary idempotency: Co-op fires an IPN for every credit, including ones
        // already confirmed as STK pushes. The primary check (findByTransactionRef) only
        // catches when the IPN's txId matches the stored transactionRef — but a confirmed
        // STK stores the M-Pesa receipt as transactionRef while the IPN uses a Co-op CBS ID.
        // This guard catches the overlap so the same payment never creates two records.
        if (mpesaRef != null && paymentRepository.existsByMpesaRef(mpesaRef)) {
            log.info("Co-op IPN: payment with mpesaRef={} already exists — skipping duplicate IPN (txId={})",
                    mpesaRef, txId);
            return;
        }

        // SAC-256: If normalizeIpn returned empty (a coop_transaction already exists for this
        // mpesaRef — e.g. stored by the mini-statement poller), check whether savings have
        // already been credited under that record.  If yes, skip the STK matching path:
        // allowing it to proceed would credit savings a second time under a different reference
        // (the CBS txId instead of mpesaRef), bypassing the existsByReference idempotency check.
        if (coopTxOpt.isEmpty() && mpesaRef != null) {
            // SAC-256: Use existsBy (not findBy) to avoid NonUniqueResultException if a race
            // condition left both an IPN and a mini-statement record for the same mpesaRef.
            // Returns true if ANY coop_transaction for this mpesaRef has savings_credited = true.
            if (coopTransactionRepository.existsByMpesaRefAndSavingsCreditedIsTrue(mpesaRef)) {
                log.info("Co-op IPN: savings already credited for mpesaRef={} — skipping STK match to prevent double-credit (txId={})",
                        mpesaRef, txId);
                return;
            }
        }

        String txType = isCredit ? "CR" : "DR";
        log.info("Co-op IPN: {} KES {} — {} ({}). PaymentRef={} TxId={} MpesaRef={} MemberId={}",
                txType, amount, senderName, phone, ipn.getPaymentRef(), txId, mpesaRef, resolvedMemberId);

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
                // Confirmed STK push — member already set at initiation time.
                // accountReference = "DEP-..." → SavingsPaymentListener handles GL.
                // Mark the CoopTransaction created by normalizeIpn as savings-credited so
                // the re-enrich endpoint doesn't double-credit via the PAYBILL- path.
                coopTxOpt.ifPresent(ct -> coopEventNormalizer.markSavingsCredited(ct.getId()));

                payment.setTransactionRef(txId);
                payment.setMpesaRef(mpesaRef);
                payment.setProviderMetadata(rawJson);
                payment.setSenderName(senderName);
                payment.setTransactionType("CR");
                markCompleted(payment, txId, rawJson);
            } else {
                // Guard: if a COMPLETED STK_PUSH already exists for this mpesaRef,
                // this is a duplicate IPN for the same transaction — skip it.
                // This prevents a PAYBILL_DEPOSIT record being created 30-60 seconds
                // after the STK was already confirmed, which causes double-entries in
                // Daily Collections and double-credits to savings.
                if (mpesaRef != null && paymentRepository.existsByMpesaRefAndPaymentTypeAndStatus(
                        mpesaRef, "STK_PUSH", PaymentStatus.COMPLETED)) {
                    log.info("Co-op IPN: skipping duplicate — STK_PUSH already COMPLETED for mpesaRef={}. " +
                            "Marking coop_transaction savings_credited.", mpesaRef);
                    coopTxOpt.ifPresent(ct -> {
                        if (!ct.isSavingsCredited()) {
                            // markSavingsCredited handles the save internally
                            coopEventNormalizer.markSavingsCredited(ct.getId());
                        }
                    });
                    return;
                }

                // New paybill deposit — no pre-existing pending or completed STK.
                payment = Payment.builder()
                        .transactionRef(txId)
                        .internalRef("IPN-" + txId)
                        .mpesaRef(mpesaRef)
                        .memberId(resolvedMemberId)          // attach member if resolved
                        .amount(amount)
                        .paymentMethod("MPESA_COOP_IPN")
                        .paymentType("PAYBILL_DEPOSIT")
                        .transactionType("CR")
                        .senderPhoneNumber(phone)
                        .senderName(senderName)
                        .accountReference(ipn.getPaymentRef())
                        .status(PaymentStatus.COMPLETED)
                        .providerMetadata(rawJson)
                        .build();

                paymentRepository.save(payment);
                log.info("Co-op IPN: new CREDIT KES {} from {} saved. MemberId={}",
                        amount, senderName, resolvedMemberId);

                securityAuditService.logEvent(
                        "IPN_PAYMENT_RECEIVED", "COOP_IPN",
                        "Co-op IPN credit KES " + amount + " from " + senderName
                                + " (" + phone + "). TxId: " + txId
                );

                // Route to SavingsPaymentListener:
                //   • Member resolved → "PAYBILL-{mpesaRef}" triggers savings credit + GL
                //   • Member unknown  → post GL to suspense; no savings action (re-enrich later)
                if (resolvedMemberId != null) {
                    String eventAccountRef = "PAYBILL-" + mpesaRef;
                    eventPublisher.publishEvent(new PaymentCompletedEvent(
                            payment.getId(), resolvedMemberId, amount, eventAccountRef, txId
                    ));
                } else {
                    // No member resolved — post GL to suspense so the balance sheet stays intact.
                    // When re-enrich matches this to a member, it will reverse the suspense entry
                    // and post the proper savings credit.
                    java.time.LocalDate valueDate = coopTxOpt
                            .map(ct -> ct.getValueDate() != null
                                    ? ct.getValueDate().toLocalDate()
                                    : ct.getCreatedAt().toLocalDate())
                            .orElse(java.time.LocalDate.now());
                    journalEntryService.postNonMemberBankCredit(amount, mpesaRef,
                            ipn.getNarration(), valueDate);
                }
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

            // Post GL entry — every debit must be on the books regardless of type
            java.time.LocalDate valueDate = ipn.getValueDate() != null
                    ? java.time.LocalDate.parse(ipn.getValueDate().substring(0, 10))
                    : java.time.LocalDate.now();
            journalEntryService.postAccountDebit(amount, txId, ipn.getNarration(), valueDate);

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

        // SAC-256: use the actual M-Pesa ref (mpesaRef) as receiptNumber, not the
        // Co-op CBS transaction ID.  Route1 in SavingsPaymentListener reads
        // event.receiptNumber() as the mpesaRef to:
        //   (a) detect if the PAYBILL path already credited savings under this ref
        //   (b) update the pending savings tx reference from DEP-xxx to the real ref
        // Using the CBS ID instead caused both checks to fail, allowing double-credit
        // when mini-statement credited savings first under mpesaRef, then the STK
        // confirmation credited again under a different (CBS-ID) reference.
        String receiptNumber = payment.getMpesaRef() != null ? payment.getMpesaRef()
                : (transactionId != null ? transactionId : payment.getInternalRef());

        eventPublisher.publishEvent(new PaymentCompletedEvent(
                payment.getId(),
                payment.getMemberId(),
                payment.getAmount(),
                payment.getAccountReference(),
                receiptNumber
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