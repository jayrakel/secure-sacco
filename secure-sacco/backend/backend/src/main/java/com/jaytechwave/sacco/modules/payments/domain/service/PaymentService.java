package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.payments.api.dto.DarajaDTOs.StkCallbackResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.DarajaDTOs.StkPushSyncResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final DarajaApiService darajaApiService;
    private final PaymentRepository paymentRepository;

    // Decoupled Event Publisher replaces direct service injections
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public InitiateStkResponse initiateMpesaStkPush(InitiateStkRequest request, UUID memberId) {

        String formattedPhone = request.phoneNumber().replaceAll("\\s+", "");
        if (formattedPhone.startsWith("+")) {
            formattedPhone = formattedPhone.substring(1);
        } else if (formattedPhone.startsWith("0")) {
            formattedPhone = "254" + formattedPhone.substring(1);
        }
        String formattedAmount = String.valueOf(request.amount().intValue());

        // 1. Send Request to Daraja
        StkPushSyncResponse darajaResponse = darajaApiService.initiateStkPush(
                formattedPhone,
                formattedAmount,
                request.accountReference(),
                "SACCO Deposit"
        );

        if (!"0".equals(darajaResponse.getResponseCode())) {
            throw new RuntimeException("Failed to initiate STK push: " + darajaResponse.getResponseDescription());
        }

        // 2. Save Pending Payment in DB
        Payment payment = Payment.builder()
                .memberId(memberId)
                .internalRef(darajaResponse.getCheckoutRequestID())
                .amount(request.amount())
                .paymentMethod("MPESA")
                .paymentType("STK_PUSH")
                .accountReference(request.accountReference())
                .senderPhoneNumber(formattedPhone)
                .status(PaymentStatus.PENDING)
                .build();

        paymentRepository.save(payment);

        return new InitiateStkResponse(
                "STK Push initiated successfully.",
                darajaResponse.getCheckoutRequestID(),
                darajaResponse.getCustomerMessage()
        );
    }

    @Transactional
    public void processStkCallback(String rawJson, StkCallbackResponse callbackResponse) {
        StkCallbackResponse.StkCallback stkCallback = callbackResponse.getBody().getStkCallback();
        String checkoutRequestID = stkCallback.getCheckoutRequestID();

        Payment payment = paymentRepository.findByInternalRef(checkoutRequestID)
                .orElseThrow(() -> new RuntimeException("Payment not found for CheckoutRequestID: " + checkoutRequestID));

        // Save exact payload for auditing purposes
        payment.setProviderMetadata(rawJson);

        // ResultCode 0 means the user entered their PIN successfully and had funds
        if (stkCallback.getResultCode() == 0) {
            payment.setStatus(PaymentStatus.COMPLETED);

            String receiptNumber = null;

            // Extract the Mpesa Receipt Number (e.g., NLJ7RT61SV)
            if (stkCallback.getCallbackMetadata() != null && stkCallback.getCallbackMetadata().getItem() != null) {
                for (StkCallbackResponse.Item item : stkCallback.getCallbackMetadata().getItem()) {
                    if ("MpesaReceiptNumber".equals(item.getName())) {
                        receiptNumber = String.valueOf(item.getValue());
                        payment.setTransactionRef(receiptNumber);
                    }
                }
            }

            // Save the payment state BEFORE publishing events, so listeners see it as COMPLETED
            paymentRepository.save(payment);
            log.info("Payment SUCCESS. Receipt: {}", receiptNumber);

            // ==========================================
            // BROADCAST THE EVENT TO ALL OTHER DOMAINS
            // ==========================================
            if (payment.getMemberId() != null) {
                eventPublisher.publishEvent(new PaymentCompletedEvent(
                        payment.getId(),
                        payment.getMemberId(),
                        payment.getAmount(),
                        payment.getAccountReference(),
                        receiptNumber != null ? receiptNumber : checkoutRequestID
                ));
            }

        } else {
            // ResultCode != 0 means failure (e.g. user canceled prompt, wrong PIN, insufficient funds)
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(stkCallback.getResultDesc());
            paymentRepository.save(payment);
            log.warn("Payment FAILED. Reason: {}", stkCallback.getResultDesc());
        }
    }
}