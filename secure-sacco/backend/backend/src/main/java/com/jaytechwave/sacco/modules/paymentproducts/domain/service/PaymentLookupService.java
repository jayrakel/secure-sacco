package com.jaytechwave.sacco.modules.paymentproducts.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.DepositAllocation;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.DepositAllocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * SAC-264: admin tool — search by M-Pesa reference (or internal ref, for a
 * payment still awaiting confirmation) and see EVERY route it was split
 * across — savings, penalty, loan, custom products — side by side, all
 * sharing one reference. Answers "where did this exact deposit go?" without
 * having to check the Savings log, Penalties page, Loans page, and every
 * Payment Products tab separately.
 */
@Service
@RequiredArgsConstructor
public class PaymentLookupService {

    private final PaymentRepository           paymentRepository;
    private final DepositAllocationRepository allocationRepository;
    private final MemberRepository            memberRepository;

    @Transactional(readOnly = true)
    public Optional<PaymentRouteLookupResponse> lookupByReference(String reference) {
        if (reference == null || reference.isBlank()) return Optional.empty();
        String trimmed = reference.trim();

        Payment payment = paymentRepository.findByMpesaRef(trimmed)
                .or(() -> paymentRepository.findByInternalRef(trimmed))
                .or(() -> paymentRepository.findByTransactionRef(trimmed))
                .orElse(null);

        if (payment == null) return Optional.empty();

        Member member = payment.getMemberId() != null
                ? memberRepository.findById(payment.getMemberId()).orElse(null)
                : null;

        List<DepositAllocation> allocations = allocationRepository.findByPaymentId(payment.getId());
        boolean isSplit = !allocations.isEmpty();

        List<RouteItem> routes = allocations.stream()
                .map(a -> new RouteItem(
                        a.getProduct().getName(),
                        a.getProduct().getModuleType(),
                        a.getAmount(),
                        a.getStatus().name(),
                        a.getFailureReason(),
                        a.getRoutedAt()
                ))
                .toList();

        return Optional.of(new PaymentRouteLookupResponse(
                payment.getId(),
                payment.getMpesaRef(),
                payment.getInternalRef(),
                member != null ? member.getMemberNumber() : null,
                member != null ? (member.getFirstName() + " " + member.getLastName()) : "Unknown",
                payment.getSenderPhoneNumber(),
                payment.getAmount(),
                payment.getStatus().name(),
                payment.getFailureReason(),
                payment.getCreatedAt(),
                isSplit,
                routes
        ));
    }
}