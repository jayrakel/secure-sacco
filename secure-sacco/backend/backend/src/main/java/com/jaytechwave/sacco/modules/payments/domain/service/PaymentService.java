package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.payments.api.dto.DarajaDTOs.StkCallbackResponse; // <-- Missing import added
import com.jaytechwave.sacco.modules.payments.api.dto.DarajaDTOs.StkPushSyncResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final DarajaApiService darajaApiService;
    private final PaymentRepository paymentRepository;

    @Transactional
    public InitiateStkResponse initiateMpesaStkPush(InitiateStkRequest request) {

        String formattedPhone = request.phoneNumber().replaceAll("\\s+", ""); // Remove spaces
        if (formattedPhone.startsWith("+")) {
            formattedPhone = formattedPhone.substring(1); // Remove +
        } else if (formattedPhone.startsWith("0")) {
            formattedPhone = "254" + formattedPhone.substring(1); // Replace 0 with 254
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
                // We use Daraja's CheckoutRequestID as our internal tracker to map callbacks later
                .internalRef(darajaResponse.getCheckoutRequestID())
                .amount(request.amount())
                .paymentMethod("MPESA")
                .paymentType("STK_PUSH")
                .accountReference(request.accountReference())
                .senderPhoneNumber(formattedPhone)
                .status("PENDING")
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
            payment.setStatus("COMPLETED");

            // Extract the Mpesa Receipt Number (e.g., NLJ7RT61SV)
            if (stkCallback.getCallbackMetadata() != null && stkCallback.getCallbackMetadata().getItem() != null) {
                for (StkCallbackResponse.Item item : stkCallback.getCallbackMetadata().getItem()) {
                    if ("MpesaReceiptNumber".equals(item.getName())) {
                        payment.setTransactionRef(String.valueOf(item.getValue()));
                    }
                }
            }

            // TODO: Here you could trigger an application event (e.g., ApplicationEventPublisher)
            // to automatically credit the member's SACCO savings account now that the payment is confirmed.

        } else {
            // ResultCode != 0 means failure (e.g. user canceled prompt, wrong PIN, insufficient funds)
            payment.setStatus("FAILED");
            payment.setFailureReason(stkCallback.getResultDesc());
        }

        paymentRepository.save(payment);
    }
}