package com.jaytechwave.sacco.modules.core.notifications;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.domain.event.NonMemberPaymentReceivedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.DepositAllocation;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.DepositAllocationRepository;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccount;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationPaymentListener {

    private final SmsNotificationService smsNotificationService;
    private final MemberRepository memberRepository;
    private final SavingsAccountRepository savingsAccountRepository;
    private final SavingsTransactionRepository savingsTransactionRepository;
    private final UserRepository userRepository;
    private final DepositAllocationRepository depositAllocationRepository;

    @Value("${sacco.notifications.admin-alert-roles:CHAIRPERSON,SECRETARY,TREASURER}")
    private List<String> adminAlertRoles;

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
            if (phone != null && !phone.isBlank()) {
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
                smsNotificationService.sendNotificationSms(phone, message);
            }

            // Notify Admins
            String fullName = member.getFirstName() + (member.getLastName() != null ? " " + member.getLastName() : "");
            notifyAdmins(fullName, event.amount(), event.receiptNumber() != null ? event.receiptNumber() : "N/A", event.paymentId());

        } catch (Exception e) {
            log.error("NotificationPaymentListener: Failed to send SMS for PaymentCompletedEvent. {}", e.getMessage(), e);
        }
    }

    @Async
    @EventListener
    public void handleNonMemberPaymentReceived(NonMemberPaymentReceivedEvent event) {
        try {
            if (event.senderPhone() != null && !event.senderPhone().isBlank()) {
                String name = event.senderName();
                if (name == null || name.isBlank()) {
                    name = "Customer";
                }

                String[] parts = name.split(" ");
                String firstName = capitalize(parts[0]);

                String message = String.format(
                        "Dear %s, we received your payment of KES %s (Ref: %s). However, your phone number is not linked to a member account. Please contact Betterlink Ventures SACCO.",
                        firstName, event.amount().toPlainString(), event.mpesaRef()
                );

                log.info("NotificationPaymentListener: Sending SMS to Non-Member (Phone: {})", event.senderPhone());
                smsNotificationService.sendNotificationSms(event.senderPhone(), message);
            }

            // Notify Admins
            notifyAdmins(event.senderName(), event.amount(), event.mpesaRef(), event.paymentId());

        } catch (Exception e) {
            log.error("NotificationPaymentListener: Failed to send SMS for NonMemberPaymentReceivedEvent. {}", e.getMessage(), e);
        }
    }

    private void notifyAdmins(String senderName, BigDecimal amount, String mpesaRef, UUID paymentId) {
        String formattedAmount = formatAmount(amount);
        String dateStr = ZonedDateTime.now(ZoneId.of("Africa/Nairobi")).format(DateTimeFormatter.ofPattern("d/M/yy HH:mm"));
        String name = formatName(senderName);
        
        String allocationsStr = "";
        if (paymentId != null) {
            List<DepositAllocation> allocations = depositAllocationRepository.findByPaymentId(paymentId);
            if (allocations != null && !allocations.isEmpty()) {
                String allocs = allocations.stream()
                        .map(a -> formatProductName(a.getProduct().getName()) + ":" + formatAmount(a.getAmount()))
                        .collect(Collectors.joining(", "));
                allocationsStr = " [" + allocs + "]";
            }
        }

        String adminMessage = String.format("Dear BETTER LINK VENTURES LTD, you have received Ksh. %s from %s on %s. MPESA Ref: %s.%s",
                formattedAmount, name, dateStr, mpesaRef, allocationsStr);

        List<User> admins = userRepository.findAllByRolesNameInAndIsDeletedFalse(adminAlertRoles);
        log.info("NotificationPaymentListener: Sending admin alerts to {} admins for payment {}", admins.size(), paymentId);
        
        for (User admin : admins) {
            String adminPhone = admin.getPhoneNumber();
            if (adminPhone != null && !adminPhone.isBlank()) {
                smsNotificationService.sendNotificationSms(adminPhone, adminMessage);
            }
        }
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) return "0";
        String str = amount.stripTrailingZeros().toPlainString();
        return str;
    }

    private String formatName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Customer";
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) return capitalize(parts[0]);
        return capitalize(parts[0]) + " " + capitalize(parts[1]);
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return "";
        return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
    }

    private String formatProductName(String productName) {
        if (productName == null) return "Unk";
        String lower = productName.toLowerCase();
        if (lower.contains("saving")) return "Sav";
        if (lower.contains("loan")) return "Ln";
        if (lower.contains("penal")) return "Pen";
        if (lower.contains("share")) return "Shr";
        return productName.length() > 3 ? productName.substring(0, 3) : productName;
    }
}
