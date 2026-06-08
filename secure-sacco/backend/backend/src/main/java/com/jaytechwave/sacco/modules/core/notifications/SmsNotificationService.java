package com.jaytechwave.sacco.modules.core.notifications;

import com.africastalking.AfricasTalking;
import com.africastalking.SmsService;
import com.africastalking.sms.Recipient;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Sends SMS messages via Africa's Talking.
 *
 * <p>All sends are {@code @Async} so they never block the calling request thread.
 * Set {@code AT_SANDBOX=true} (the default) to use the Africa's Talking sandbox
 * for development/staging — no real SMS is sent and no balance is consumed.
 * Set {@code AT_SANDBOX=false} in production to go live.
 *
 * <p>Required environment variables:
 * <ul>
 *   <li>{@code AT_USERNAME}  — Africa's Talking account username</li>
 *   <li>{@code AT_API_KEY}   — Africa's Talking API key</li>
 *   <li>{@code AT_SENDER_ID} — Short code or alphanumeric sender ID (optional)</li>
 *   <li>{@code AT_SANDBOX}   — {@code true} for sandbox, {@code false} for live</li>
 * </ul>
 */
@Slf4j
@Service
public class SmsNotificationService {

    @Value("${africastalking.username:sandbox}")
    private String username;

    @Value("${africastalking.api-key:}")
    private String apiKey;

    @Value("${africastalking.sender-id:#{null}}")
    private String senderId;

    @Value("${africastalking.sandbox:true}")
    private boolean sandbox;

    private SmsService smsService;

    @PostConstruct
    public void init() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("SmsNotificationService: AT_API_KEY is not set — SMS delivery will be skipped. " +
                    "Set AT_API_KEY to enable Africa's Talking SMS.");
            return;
        }
        try {
            AfricasTalking.initialize(username, apiKey);
            smsService = AfricasTalking.getService(AfricasTalking.SERVICE_SMS);
            log.info("SmsNotificationService: Africa's Talking initialized. username={} sandbox={}", username, sandbox);
        } catch (Exception e) {
            log.error("SmsNotificationService: Failed to initialize Africa's Talking: {}", e.getMessage());
        }
    }

    /**
     * Sends a 6-digit OTP to the given phone number.
     *
     * <p>The phone number must be in international format (e.g. {@code +254721338747}).
     * The call is fire-and-forget — delivery failure is logged but does not throw.
     *
     * @param phoneNumber E.164 phone number (e.g. {@code +254721338747})
     * @param otp         6-digit one-time password
     */
    @Async
    public void sendOtp(String phoneNumber, String otp) {
        if (smsService == null) {
            log.warn("SmsNotificationService: SMS service not initialized — skipping OTP to {}. " +
                    "Configure AT_API_KEY to enable.", phoneNumber);
            return;
        }

        String message = String.format(
                "Your Betterlink Ventures SACCO verification code is: %s. " +
                "Valid for 10 minutes. Do not share this code with anyone.", otp);

        // Ensure E.164 format
        String normalized = normalizePhone(phoneNumber);
        if (normalized == null) {
            log.error("SmsNotificationService: Cannot send OTP — invalid phone number: {}", phoneNumber);
            return;
        }

        try {
            List<Recipient> recipients = smsService.send(
                    message,
                    senderId,   // null = default short code; set AT_SENDER_ID for custom sender
                    new String[]{normalized},
                    false       // not premium / subscription
            );

            if (recipients != null && !recipients.isEmpty()) {
                Recipient r = recipients.get(0);
                log.info("SmsNotificationService: OTP sent to {} — status={} cost={} msgId={}",
                        normalized, r.status, r.cost, r.messageId);
            }
        } catch (Exception e) {
            // Log and swallow — OTP send failure must not crash the verification request.
            // The user can retry via the resend endpoint.
            log.error("SmsNotificationService: Failed to send OTP to {}: {}", normalized, e.getMessage());
        }
    }

    /**
     * Normalises a phone number to E.164 format ({@code +254XXXXXXXXX}) for AT.
     * Returns {@code null} if the number cannot be normalised.
     */
    private String normalizePhone(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return null;
        // 0XXXXXXXXX  → +254XXXXXXXXX
        if (digits.startsWith("07") || digits.startsWith("01")) return "+254" + digits.substring(1);
        // 7XXXXXXXXX  → +254XXXXXXXXX
        if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length() == 9) return "+254" + digits;
        // 254XXXXXXXXX → +254XXXXXXXXX
        if (digits.startsWith("254") && digits.length() == 12) return "+" + digits;
        // Already has + and correct length
        if (raw.startsWith("+") && digits.length() >= 11) return "+" + digits;
        return null;
    }
}