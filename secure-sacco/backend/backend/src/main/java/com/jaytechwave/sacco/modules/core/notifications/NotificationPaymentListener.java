package com.jaytechwave.sacco.modules.core.notifications;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.domain.event.NonMemberPaymentReceivedEvent;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentReceiptUpdatedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
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
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

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
    private final PaymentRepository paymentRepository;

    /** How long to wait (ms) for the IPN to deliver the real M-Pesa ref before sending SMS */
    private static final long MPESA_REF_WAIT_MS = 60_000L; // 60 seconds
    private static final int  MPESA_REF_POLL_ATTEMPTS = 6; // check every 10s × 6 = 60s

    @Value("${sacco.notifications.admin-alert-roles:CHAIRPERSON,SECRETARY,TREASURER}")
    private List<String> adminAlertRoles;

    @Order(org.springframework.core.Ordered.LOWEST_PRECEDENCE)
    @Async
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        try {
            Optional<Member> memberOpt = memberRepository.findById(event.memberId());
            if (memberOpt.isEmpty()) {
                log.warn("NotificationPaymentListener: Member {} not found. SMS skipped.", event.memberId());
                return;
            }

            String receiptRef = event.receiptNumber();
            String sanitized = sanitizeRef(receiptRef);
            boolean ipnArrived = false;

            if ("Processing".equals(sanitized)) {
                log.info("NotificationPaymentListener: Ref is internal for payment {}. Waiting up to 60s for IPN.", event.paymentId());
                for (int i = 0; i < MPESA_REF_POLL_ATTEMPTS; i++) {
                    Thread.sleep(10_000);
                    Optional<Payment> p = paymentRepository.findById(event.paymentId());
                    if (p.isPresent() && !"Processing".equals(sanitizeRef(p.get().getMpesaRef()))) {
                        receiptRef = p.get().getMpesaRef();
                        sanitized = receiptRef;
                        ipnArrived = true;
                        log.info("NotificationPaymentListener: IPN arrived with ref {} for payment {}", receiptRef, event.paymentId());
                        break;
                    }
                }
                if (!ipnArrived) {
                    log.warn("NotificationPaymentListener: IPN wait timeout for payment {}. Using truncated internal ref.", event.paymentId());
                    sanitized = receiptRef != null && receiptRef.length() > 8 ? receiptRef.substring(0, 8).toUpperCase() : "N/A";
                } else {
                    // SAC-301: If the IPN arrived, PaymentReceiptUpdatedEvent was already fired by PaymentService!
                    // To prevent duplicate SMS, we abort here.
                    log.info("NotificationPaymentListener: Aborting duplicate SMS since PaymentReceiptUpdatedEvent will handle it.");
                    return;
                }
            }

            sendDepositSms(memberOpt.get(), event.amount(), sanitized, event.paymentId());
        } catch (Exception e) {
            log.error("NotificationPaymentListener: Failed to send SMS for PaymentCompletedEvent. {}", e.getMessage(), e);
        }
    }

    @Order(org.springframework.core.Ordered.LOWEST_PRECEDENCE)
    @Async
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePaymentReceiptUpdated(PaymentReceiptUpdatedEvent event) {
        try {
            Optional<Member> memberOpt = memberRepository.findById(event.memberId());
            if (memberOpt.isEmpty()) {
                log.warn("NotificationPaymentListener: Member {} not found. SMS skipped.", event.memberId());
                return;
            }
            
            String sanitized = sanitizeRef(event.receiptNumber());
            sendDepositSms(memberOpt.get(), event.amount(), sanitized, event.paymentId());
        } catch (Exception e) {
            log.error("NotificationPaymentListener: Failed to send SMS for PaymentReceiptUpdatedEvent. {}", e.getMessage(), e);
        }
    }

    private void sendDepositSms(Member member, BigDecimal amount, String receiptRef, UUID paymentId) {
        String phone = member.getPhoneNumber();
        if (phone != null && !phone.isBlank()) {
            BigDecimal balance = BigDecimal.ZERO;
            Optional<SavingsAccount> accountOpt = savingsAccountRepository.findByMemberId(member.getId());
            if (accountOpt.isPresent()) {
                balance = savingsTransactionRepository.calculateBalance(accountOpt.get().getId());
            }

            String name = member.getFirstName();
            if (name == null || name.isBlank()) name = "Member";
            
            String message = String.format(
                    "Dear %s, deposit of KES %s received. Ref: %s. New savings balance is KES %s. Thank you for choosing Betterlink Ventures SACCO.",
                    name, formatAmount(amount), receiptRef, formatAmount(balance)
            );

            log.info("NotificationPaymentListener: Sending SMS to Member {} (Phone: {}) Ref: {}", member.getMemberNumber(), phone, receiptRef);
            smsNotificationService.sendNotificationSms(phone, message);
        }

        String fullName = member.getFirstName() + (member.getLastName() != null ? " " + member.getLastName() : "");
        notifyAdmins(fullName, phone, amount, receiptRef, paymentId);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSavingsTransactionPosted(com.jaytechwave.sacco.modules.savings.domain.event.SavingsTransactionPostedEvent event) {
        try {
            if (event.type() != com.jaytechwave.sacco.modules.savings.domain.entity.TransactionType.WITHDRAWAL) {
                return;
            }

            Optional<Member> memberOpt = memberRepository.findById(event.memberId());
            if (memberOpt.isEmpty()) return;
            Member member = memberOpt.get();

            String phone = member.getPhoneNumber();
            if (phone != null && !phone.isBlank()) {
                BigDecimal balance = savingsTransactionRepository.calculateBalance(event.savingsAccountId());
                String name = member.getFirstName();
                if (name == null || name.isBlank()) name = "Member";

                String message = String.format(
                        "Dear %s, a withdrawal of KES %s has been processed from your Savings Account. Ref: %s. New balance is KES %s. Thank you for choosing Betterlink Ventures SACCO.",
                        name, formatAmount(event.amount()), sanitizeRef(event.reference()), formatAmount(balance)
                );

                log.info("NotificationPaymentListener: Sending SMS for withdrawal to Member {} (Phone: {})", member.getMemberNumber(), phone);
                smsNotificationService.sendNotificationSms(phone, message);
            }
        } catch (Exception e) {
            log.error("NotificationPaymentListener: Failed to send SMS for SavingsTransactionPostedEvent. {}", e.getMessage(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleNonMemberPaymentReceived(NonMemberPaymentReceivedEvent event) {
        try {
            if (event.senderPhone() != null && !event.senderPhone().isBlank()) {
                String message = String.format(
                        "Dear Customer, payment of KES %s received. Ref: %s. Thank you for choosing Betterlink Ventures SACCO.",
                        formatAmount(event.amount()), sanitizeRef(event.mpesaRef())
                );

                log.info("NotificationPaymentListener: Sending SMS to Non-Member (Phone: {})", event.senderPhone());
                smsNotificationService.sendNotificationSms(event.senderPhone(), message);
            }

            notifyAdmins(event.senderName(), event.senderPhone(), event.amount(), sanitizeRef(event.mpesaRef()), event.paymentId());

        } catch (Exception e) {
            log.error("NotificationPaymentListener: Failed to send SMS for NonMemberPaymentReceivedEvent. {}", e.getMessage(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleBankDebitReceived(com.jaytechwave.sacco.modules.payments.domain.event.BankDebitReceivedEvent event) {
        try {
            String formattedAmount = formatAmount(event.amount());
            String dateStr = ZonedDateTime.now(ZoneId.of("Africa/Nairobi")).format(DateTimeFormatter.ofPattern("d/M/yy HH:mm"));
            
            String adminMessage = String.format("Dear BETTER LINK VENTURES LTD, your Co-op Bank account has been debited Ksh. %s on %s. Narration: %s. Ref: %s.",
                    formattedAmount, dateStr, event.narration() != null ? event.narration() : "N/A", sanitizeRef(event.reference()));

            List<User> admins = userRepository.findAllByRolesNameInAndIsDeletedFalse(adminAlertRoles);
            log.info("NotificationPaymentListener: Sending admin alerts to {} admins for bank debit {}", admins.size(), event.paymentId());
            
            for (User admin : admins) {
                String adminPhone = admin.getPhoneNumber();
                if (adminPhone != null && !adminPhone.isBlank()) {
                    smsNotificationService.sendNotificationSms(adminPhone, adminMessage);
                }
            }
        } catch (Exception e) {
            log.error("NotificationPaymentListener: Failed to send SMS for BankDebitReceivedEvent. {}", e.getMessage(), e);
        }
    }

    private void notifyAdmins(String senderName, String senderPhone, BigDecimal amount, String mpesaRef, UUID paymentId) {
        String formattedAmount = formatAmount(amount);
        String dateStr = ZonedDateTime.now(ZoneId.of("Africa/Nairobi")).format(DateTimeFormatter.ofPattern("d/M/yy HH:mm"));
        String name = formatName(senderName, senderPhone);
        
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
        return amount.stripTrailingZeros().toPlainString();
    }

    private String formatName(String fullName, String phone) {
        if (fullName == null || fullName.isBlank()) {
            return (phone != null && !phone.isBlank()) ? phone : "Customer";
        }
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
    
    private String sanitizeRef(String ref) {
        if (ref == null || ref.isBlank()) return "N/A";
        // Internal references from Co-op are usually long hex strings or UUIDs.
        // Mpesa references are usually 10 chars (e.g. SLD7Q8D9W2).
        if (ref.length() > 15 && ref.matches("^[a-fA-F0-9\\-]+$")) {
            return "Processing";
        }
        return ref;
    }
}
