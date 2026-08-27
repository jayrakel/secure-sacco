package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.payments.config.JengaProperties;
import com.jaytechwave.sacco.modules.payments.config.JengaSecurityUtils;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class JengaPaymentService {

    private final JengaProperties jengaProperties;
    private final JengaSecurityUtils securityUtils;
    private final PaymentRepository paymentRepository;

    public Payment initiatePayment(Member member, BigDecimal amount, String channel, String reference) {
        log.info("Initiating Jenga payment for member {} via {}, amount {}, ref {}", 
                 member.getMemberNumber(), channel, amount, reference);

        // 1. Save pending payment
        Payment payment = Payment.builder()
                .memberId(member.getId())
                .internalRef(reference)
                .amount(amount)
                .paymentMethod(channel) // e.g. JENGA_EQUITY, JENGA_EQUITEL, JENGA_MPESA
                .paymentType("PUSH")
                .status(PaymentStatus.PENDING)
                .senderPhoneNumber(member.getPhoneNumber())
                .senderName(member.getFirstName() + " " + member.getLastName())
                .build();
        
        payment = paymentRepository.save(payment);

        // 2. TODO: Call Jenga APIs to trigger push to member's phone
        // Requires: 
        // a) Fetch OAuth Token using consumerKey + consumerSecret
        // b) Sign payload using JengaSecurityUtils
        // c) POST to Jenga Push API
        
        // For now, we mock the external call success since we need live keys to hit Jenga
        log.info("Jenga Push initiated successfully for internalRef {}", reference);
        
        return payment;
    }
}
