package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class JengaCallbackService {

    private final PaymentRepository paymentRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final PiiSearchHashConverter piiHashConverter;
    private final NarrationSplitParser narrationSplitParser;
    private final ApplicationEventPublisher eventPublisher;
    private final SavingsService savingsService;

    @Transactional
    public void processIpn(String equityRef, String accountNumber, BigDecimal amount, String senderPhone, String senderName) {
        log.info("Processing Jenga IPN. Ref: {}, Account: {}, Amount: {}", equityRef, accountNumber, amount);

        // Basic deduplication
        if (paymentRepository.findByEquityRef(equityRef).isPresent()) {
            log.info("Jenga IPN {} already processed. Ignoring.", equityRef);
            return;
        }

        // Try to identify the member by phone number first
        Optional<Member> memberOpt = findMemberByPhone(senderPhone);
        if (memberOpt.isEmpty()) {
            // Attempt fallback extraction if phone is missing but they put their member number in the account number
            String baseAccount = accountNumber != null && accountNumber.contains("#") ? accountNumber.substring(0, accountNumber.indexOf("#")).trim() : (accountNumber != null ? accountNumber.trim() : "");
            memberOpt = memberRepository.findByMemberNumber(baseAccount);
        }

        if (memberOpt.isEmpty()) {
            log.error("Failed to identify member for Jenga IPN {}. Phone: {}, Account: {}", equityRef, senderPhone, accountNumber);
            // In a real system, send to a suspense account. For now, we throw or ignore.
            throw new IllegalArgumentException("Unidentified member for payment: " + equityRef);
        }

        Member member = memberOpt.get();

        // Pass to Narration Parser
        Optional<Payment> splitPaymentOpt = narrationSplitParser.processNarration(accountNumber, amount, member);

        if (splitPaymentOpt.isPresent()) {
            // It's a split payment (either pre-saved Short Code or dynamic Explicit String)
            Payment payment = splitPaymentOpt.get();
            payment.setEquityRef(equityRef);
            payment.setAmount(amount); // Confirm amount matches
            payment.setStatus(PaymentStatus.COMPLETED);
            paymentRepository.save(payment);

            // Fire event so DepositAllocationRouterService handles the routing
            eventPublisher.publishEvent(new PaymentCompletedEvent(
                    payment.getId(),
                    payment.getMemberId(),
                    payment.getAmount(),
                    payment.getInternalRef(),
                    payment.getEquityRef() != null ? payment.getEquityRef() : payment.getMpesaRef()
            ));
            log.info("Processed Jenga Split Payment {} via Narration Parser", equityRef);
        } else {
            // No valid split found. Fallback to default Savings.
            Payment payment = Payment.builder()
                    .memberId(member.getId())
                    .internalRef("JENGA-" + java.util.UUID.randomUUID().toString().substring(0, 8))
                    .equityRef(equityRef)
                    .amount(amount)
                    .paymentMethod("JENGA_EQUITY")
                    .paymentType("PAYBILL")
                    .status(PaymentStatus.COMPLETED)
                    .senderPhoneNumber(senderPhone)
                    .senderName(senderName)
                    .build();
            paymentRepository.save(payment);

            savingsService.processMpesaPaybillDeposit(
                    member.getId(),
                    amount,
                    equityRef, // Use Equity Ref as the journal reference
                    senderPhone
            );
            log.info("Processed Jenga Default Savings Payment {}", equityRef);
        }
    }

    private Optional<Member> findMemberByPhone(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) return Optional.empty();
        
        java.util.List<String> candidates = new java.util.ArrayList<>();
        String cleaned = rawPhone.trim();
        String digits = cleaned.replaceAll("[^0-9]", "");
        
        String nineSuffix = null;
        if (digits.startsWith("254") && digits.length() == 12) {
            nineSuffix = digits.substring(3);
        } else if ((digits.startsWith("07") || digits.startsWith("01")) && digits.length() == 10) {
            nineSuffix = digits.substring(1);
        } else if (digits.length() == 9) {
            nineSuffix = digits;
        }
        
        if (nineSuffix != null) {
            candidates.add("0" + nineSuffix);
            candidates.add("254" + nineSuffix);
            candidates.add("+254" + nineSuffix);
            candidates.add(nineSuffix);
        } else {
            candidates.add(cleaned);
        }
        
        for (String candidate : candidates) {
            String hash = piiHashConverter.convertToDatabaseColumn(candidate);
            Optional<User> user = userRepository.findByPhoneNumberHash(hash);
            if (user.isPresent() && user.get().getMember() != null) {
                return Optional.of(user.get().getMember());
            }
        }
        
        return Optional.empty();
    }
}
