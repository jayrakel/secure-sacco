package com.jaytechwave.sacco.modules.core.notifications;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.domain.event.NonMemberPaymentReceivedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccount;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationPaymentListener {

    private final SmsNotificationService smsNotificationService;
    private final MemberRepository memberRepository;
    private final SavingsAccountRepository savingsAccountRepository;
    private final SavingsTransactionRepository savingsTransactionRepository;

    @Async
    @EventListener
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        try {
            // Find member
            Optional<Member> memberOpt = memberRepository.findById(event.memberId());
            if (memberOpt.isEmpty()) {
                log.warn("NotificationPaymentListener: Member {} not found. SMS skipped.", event.memberId());
                return;
            }
            Member member = memberOpt.get();

            // Make sure the member has a valid phone number
            String phone = member.getPhoneNumber();
            if (phone == null || phone.isBlank()) {
                log.warn("NotificationPaymentListener: Member {} has no phone number. SMS skipped.", member.getMemberNumber());
                return;
            }

            // Calculate new balance
            BigDecimal balance = BigDecimal.ZERO;
            Optional<SavingsAccount> accountOpt = savingsAccountRepository.findByMemberId(member.getId());
            if (accountOpt.isPresent()) {
                balance = savingsTransactionRepository.calculateBalance(accountOpt.get().getId());
            }

            // Compose message
            String name = member.getFirstName();
            if (name == null || name.isBlank()) {
                name = "Member";
            }
            String message = String.format(
                    "Dear %s, we have received your deposit of KES %s. Your new savings balance is KES %s. Thank you for choosing Betterlink Ventures SACCO.",
                    name, event.amount().toPlainString(), balance.toPlainString()
            );

            log.info("NotificationPaymentListener: Sending SMS to Member {} (Phone: {})", member.getMemberNumber(), phone);
            
            // Dispatch SMS
            smsNotificationService.sendNotificationSms(phone, message);

        } catch (Exception e) {
            log.error("NotificationPaymentListener: Failed to send SMS for PaymentCompletedEvent. {}", e.getMessage(), e);
        }
    }

    @Async
    @EventListener
    public void handleNonMemberPaymentReceived(NonMemberPaymentReceivedEvent event) {
        try {
            if (event.senderPhone() == null || event.senderPhone().isBlank()) {
                log.warn("NotificationPaymentListener: Non-member payment {} has no phone number. SMS skipped.", event.mpesaRef());
                return;
            }

            String name = event.senderName();
            if (name == null || name.isBlank()) {
                name = "Customer";
            }

            // Clean up name format if it comes from M-Pesa (e.g. JOHN DOE SMITH -> John)
            String[] parts = name.split(" ");
            String firstName = parts[0];
            firstName = firstName.substring(0, 1).toUpperCase() + firstName.substring(1).toLowerCase();

            // Compose message
            String message = String.format(
                    "Dear %s, we received your payment of KES %s (Ref: %s). However, your phone number is not linked to a member account. Please contact Betterlink Ventures SACCO.",
                    firstName, event.amount().toPlainString(), event.mpesaRef()
            );

            log.info("NotificationPaymentListener: Sending SMS to Non-Member (Phone: {})", event.senderPhone());
            
            // Dispatch SMS
            smsNotificationService.sendNotificationSms(event.senderPhone(), message);

        } catch (Exception e) {
            log.error("NotificationPaymentListener: Failed to send SMS for NonMemberPaymentReceivedEvent. {}", e.getMessage(), e);
        }
    }
}
