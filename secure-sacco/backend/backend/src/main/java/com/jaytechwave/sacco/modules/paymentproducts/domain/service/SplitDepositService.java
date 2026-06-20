package com.jaytechwave.sacco.modules.paymentproducts.domain.service;

import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.StkPushResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopConnectService;
import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.AllocationStatus;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.DepositAllocation;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.DepositAllocationRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SplitDepositService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final CoopConnectService                     coopConnectService;
    private final PaymentRepository                      paymentRepository;
    private final PaymentProductRepository                productRepository;
    private final DepositAllocationRepository             allocationRepository;
    private final DepositAllocationValidationService      validationService;

    @Transactional
    public InitiateStkResponse initiateSplitDeposit(InitiateSplitDepositRequest request, UUID memberId) {

        // Re-validate server-side — never trust the client's earlier /validate call alone.
        ValidateAllocationResponse validation = validationService.validate(
                memberId, new ValidateAllocationRequest(request.totalAmount(), request.allocations()));
        if (!validation.valid()) {
            throw new IllegalArgumentException(validation.errorMessage());
        }

        String phone = normalisePhone(request.phoneNumber());
        String splitRef = "SPLIT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        String messageRef = UUID.randomUUID().toString().replace("-", "").substring(0, 20);

        // SAC-257/258: fresh token before every STK push; 20-char hex MessageReference.
        coopConnectService.invalidateTokenCache();

        StkPushResponse coopResponse = coopConnectService.initiateStkPush(
                phone, request.totalAmount(), messageRef,
                "BETTER LINK VENTURES SACCO", splitRef
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
                .amount(request.totalAmount())
                .paymentMethod("MPESA_COOP")
                .paymentType("STK_PUSH")
                .accountReference(splitRef)
                .senderPhoneNumber(phone)
                .status(PaymentStatus.PENDING)
                .build();
        payment = paymentRepository.save(payment);

        List<DepositAllocation> allocations = new ArrayList<>();
        for (AllocationLine line : request.allocations()) {
            PaymentProduct product = productRepository.findById(line.productId())
                    .orElseThrow(() -> new IllegalArgumentException("Unknown product: " + line.productId()));

            BigDecimal lineAmount = request.totalAmount()
                    .multiply(line.percentage())
                    .divide(HUNDRED, 2, RoundingMode.HALF_UP);

            allocations.add(DepositAllocation.builder()
                    .payment(payment)
                    .product(product)
                    .percentage(line.percentage())
                    .amount(lineAmount)
                    .status(AllocationStatus.PENDING)
                    .build());
        }
        allocationRepository.saveAll(allocations);

        log.info("Split deposit initiated: member={} total={} ref={} allocations={}",
                memberId, request.totalAmount(), splitRef, allocations.size());

        return new InitiateStkResponse(
                "STK Push initiated. Please check your phone.",
                splitRef,
                "Enter your M-Pesa PIN to complete the payment. Your contribution will be split automatically."
        );
    }

    private String normalisePhone(String raw) {
        String phone = raw.replaceAll("\\s+", "");
        if (phone.startsWith("+")) return phone.substring(1);
        if (phone.startsWith("0")) return "254" + phone.substring(1);
        return phone;
    }
}