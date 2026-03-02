package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.payments.api.dto.DarajaDTOs.StkCallbackResponse;
import com.jaytechwave.sacco.modules.members.domain.service.MemberService;
import com.jaytechwave.sacco.modules.payments.api.dto.DarajaDTOs.StkPushSyncResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus; // Assuming you have this Enum
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final DarajaApiService darajaApiService;
    private final PaymentRepository paymentRepository;
    private final MemberService memberService;
    private final JournalEntryService journalEntryService;

    @Transactional
    public InitiateStkResponse initiateMpesaStkPush(InitiateStkRequest request, UUID memberId) { // <--- Added memberId

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
                .memberId(memberId) // <--- Use the passed-in memberId
                .internalRef(darajaResponse.getCheckoutRequestID())
                .amount(request.amount())
                .paymentMethod("MPESA")
                .paymentType("STK_PUSH")
                .accountReference(request.accountReference())
                .senderPhoneNumber(formattedPhone)
                .status(PaymentStatus.PENDING) // <--- Use Enum (if applicable)
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
            payment.setStatus(PaymentStatus.COMPLETED); // <--- Use Enum

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

            log.info("Payment SUCCESS. Receipt: {}", receiptNumber);

            // ==========================================
            // THE STATE MACHINE & ACCOUNTING ENGINE TRIGGER
            // ==========================================
            if (payment.getMemberId() != null) {
                // If this payment was for a registration fee
                if (payment.getAccountReference() != null && payment.getAccountReference().startsWith("REG-")) {

                    // 1. Activate Member
                    memberService.activateMember(payment.getMemberId());

                    // 2. Post Accounting Journal!
                    journalEntryService.postRegistrationFeeTemplate(
                            payment.getMemberId(),
                            payment.getAmount(),
                            receiptNumber != null ? receiptNumber : checkoutRequestID
                    );
                }
                // (Later you can add an else-if here for "DEP-" for savings deposits)
            }

        } else {
            // ResultCode != 0 means failure (e.g. user canceled prompt, wrong PIN, insufficient funds)
            payment.setStatus(PaymentStatus.FAILED); // <--- Use Enum
            payment.setFailureReason(stkCallback.getResultDesc());
            log.warn("Payment FAILED. Reason: {}", stkCallback.getResultDesc());
        }

        paymentRepository.save(payment);
    }
}