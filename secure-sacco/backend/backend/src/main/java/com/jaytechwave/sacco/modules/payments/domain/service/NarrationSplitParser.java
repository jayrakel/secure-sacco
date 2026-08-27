package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.DepositAllocation;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class NarrationSplitParser {

    private final PaymentRepository paymentRepository;
    private final MemberRepository memberRepository;
    private final PaymentProductRepository paymentProductRepository;
    private final com.jaytechwave.sacco.modules.paymentproducts.domain.repository.DepositAllocationRepository allocationRepository;
    
    // Pattern to match explicit splits: e.g., SAV4000, LN1000, WF100
    private static final Pattern EXPLICIT_SPLIT_PATTERN = Pattern.compile("([A-Z]+)(\\d+)");

    /**
     * Parses the incoming bank account number to detect narrations.
     * Example inputs: 
     *  "12345#SC-839271"
     *  "12345#SAV4000LN1000WF100"
     *  "12345"
     *
     * @param accountNumber The full account number received in the IPN
     * @param amount The total payment amount
     * @param member The member making the payment
     * @return An Optional containing the pre-existing or newly generated Payment
     */
    public Optional<Payment> processNarration(String accountNumber, BigDecimal amount, Member member) {
        if (accountNumber == null || !accountNumber.contains("#")) {
            log.info("No narration found in account number: {}. Defaulting to Savings.", accountNumber);
            return Optional.empty(); // Let the caller fallback to default savings logic
        }

        String narration = accountNumber.substring(accountNumber.indexOf("#") + 1).trim().toUpperCase();
        
        // Scenario A: Short Code (App-Initiated Split)
        if (narration.startsWith("SC-") || narration.startsWith("SPLIT-")) {
            log.info("Detected Short Code narration: {}", narration);
            return paymentRepository.findByInternalRef(narration);
        }

        // Scenario B: Explicit String (True Manual Split)
        log.info("Detected Explicit String narration: {}", narration);
        return processExplicitSplit(narration, amount, member);
    }

    private Optional<Payment> processExplicitSplit(String narration, BigDecimal amount, Member member) {
        List<DepositAllocation> allocations = new ArrayList<>();
        BigDecimal totalParsedAmount = BigDecimal.ZERO;

        Matcher matcher = EXPLICIT_SPLIT_PATTERN.matcher(narration);
        while (matcher.find()) {
            String productCode = matcher.group(1);
            BigDecimal splitAmount = new BigDecimal(matcher.group(2));

            Optional<PaymentProduct> productOpt = paymentProductRepository.findByCode(productCode);
            if (productOpt.isPresent()) {
                DepositAllocation allocation = DepositAllocation.builder()
                        .product(productOpt.get())
                        .amount(splitAmount)
                        .status(com.jaytechwave.sacco.modules.paymentproducts.domain.entity.AllocationStatus.PENDING)
                        .build();
                allocations.add(allocation);
                totalParsedAmount = totalParsedAmount.add(splitAmount);
            } else {
                log.warn("Product code {} not found in explicit narration: {}", productCode, narration);
            }
        }

        if (allocations.isEmpty()) {
            log.warn("Failed to parse any valid allocations from explicit narration: {}", narration);
            return Optional.empty();
        }

        if (totalParsedAmount.compareTo(amount) != 0) {
            log.warn("Total parsed amount {} does not match IPN amount {}. Rejecting split.", totalParsedAmount, amount);
            return Optional.empty(); // Fallback to default savings
        }

        // Create the on-the-fly Payment
        Payment payment = Payment.builder()
                .memberId(member.getId())
                .internalRef("MANUAL-" + java.util.UUID.randomUUID().toString().substring(0, 8))
                .amount(amount)
                .paymentMethod("MANUAL_PAYBILL")
                .paymentType("PAYBILL")
                .status(PaymentStatus.PENDING)
                .senderPhoneNumber(member.getPhoneNumber())
                .senderName(member.getFirstName() + " " + member.getLastName())
                .build();
                
        payment = paymentRepository.save(payment);
        
        // Save the dynamic allocations linked to this new payment
        for (DepositAllocation allocation : allocations) {
            allocation.setPayment(payment);
        }
        allocationRepository.saveAll(allocations);
        
        return Optional.of(payment);
    }
}
