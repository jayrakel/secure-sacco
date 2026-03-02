package com.jaytechwave.sacco.modules.payments.domain.service;

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

    // Note: DarajaApiService is in the same package (domain.service), so no import is needed!
    private final DarajaApiService darajaApiService;
    private final PaymentRepository paymentRepository;

    @Transactional
    public InitiateStkResponse initiateMpesaStkPush(InitiateStkRequest request) {

        // Formatter (Safaricom requires format 2547XXXXXXXX, ensure your frontend/validation handles this)
        String formattedPhone = request.phoneNumber().startsWith("+") ? request.phoneNumber().substring(1) : request.phoneNumber();
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
}