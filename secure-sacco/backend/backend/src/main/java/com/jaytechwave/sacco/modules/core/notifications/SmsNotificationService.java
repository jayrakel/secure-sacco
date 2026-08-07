package com.jaytechwave.sacco.modules.core.notifications;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Sends SMS messages via Africa's Talking using a robust raw HTTP
 * implementation
 * with strict timeouts to prevent thread hanging.
 *
 * <p>
 * All sends are {@code @Async} so they never block the calling request thread.
 * Set {@code AT_SANDBOX=true} (the default) to use the Africa's Talking sandbox
 * for development/staging. Set {@code AT_SANDBOX=false} in production to go
 * live.
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

    private String apiUrl;

    @PostConstruct
    public void init() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("SmsNotificationService: AT_API_KEY is not set — SMS delivery will be skipped.");
            return;
        }

        apiUrl = sandbox
                ? "https://api.sandbox.africastalking.com/version1/messaging"
                : "https://api.africastalking.com/version1/messaging";

        log.info("SmsNotificationService: Initialized raw HTTP client. username={} sandbox={} url={}", username,
                sandbox, apiUrl);
    }

    /**
     * Sends a 6-digit OTP to the given phone number.
     */
    @Async
    public void sendOtp(String phoneNumber, String otp) {
        String message = String.format(
                "Your Betterlink Ventures SACCO verification code is: %s. " +
                        "Valid for 10 minutes. Do not share this code with anyone.",
                otp);
        sendNotificationSms(phoneNumber, message);
    }

    /**
     * Sends a custom notification SMS to the given phone number.
     */
    @Async
    public void sendNotificationSms(String phoneNumber, String message) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("SmsNotificationService: API key not set — skipping SMS to {}", phoneNumber);
            return;
        }

        String normalized = normalizePhone(phoneNumber);
        if (normalized == null) {
            log.error("SmsNotificationService: Cannot send SMS — invalid phone number: {}", phoneNumber);
            return;
        }

        try {
            log.info("SmsNotificationService: Sending SMS to {}...", normalized);

            String postData = "username=" + java.net.URLEncoder.encode(username, StandardCharsets.UTF_8) +
                    "&to=" + java.net.URLEncoder.encode(normalized, StandardCharsets.UTF_8) +
                    "&message=" + java.net.URLEncoder.encode(message, StandardCharsets.UTF_8);

            if (senderId != null && !senderId.isBlank()) {
                postData += "&from=" + java.net.URLEncoder.encode(senderId, StandardCharsets.UTF_8);
            }

            URL url = new URL(apiUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            conn.setRequestProperty("Accept", "application/json");

            // CRITICAL: Set strict timeouts (5 seconds) to prevent infinite hanging!
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            // Authentication
            // Africa's talking uses ApiKey as a header OR Basic auth depending on the
            // endpoint.
            // The standard way for /version1/messaging is the apiKey header:
            conn.setRequestProperty("apiKey", apiKey);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(postData.getBytes(StandardCharsets.UTF_8));
            }

            int responseCode = conn.getResponseCode();
            StringBuilder response = new StringBuilder();

            // Read response whether it's 200 OK or 400 Bad Request
            try (BufferedReader br = new BufferedReader(new InputStreamReader(
                    responseCode < 400 ? conn.getInputStream() : conn.getErrorStream()))) {
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line);
                }
            }

            if (responseCode == 200 || responseCode == 201) {
                log.info("SmsNotificationService: SMS sent to {} — status={} AT_Response={}",
                        normalized, responseCode, response.toString());
            } else {
                log.error("SmsNotificationService: Failed to send SMS to {}. HTTP {} Response: {}",
                        normalized, responseCode, response.toString());
            }

        } catch (java.net.SocketTimeoutException e) {
            log.error("SmsNotificationService: Timeout while sending SMS to {}: {}", normalized, e.getMessage());
        } catch (Exception e) {
            log.error("SmsNotificationService: Failed to send SMS to {}: {}", normalized, e.getMessage(), e);
        }
    }

    private String normalizePhone(String raw) {
        if (raw == null || raw.isBlank())
            return null;
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty())
            return null;
        if (digits.startsWith("07") || digits.startsWith("01"))
            return "+254" + digits.substring(1);
        if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length() == 9)
            return "+254" + digits;
        if (digits.startsWith("254") && digits.length() == 12)
            return "+" + digits;
        if (raw.startsWith("+") && digits.length() >= 11)
            return "+" + digits;
        return null;
    }
}
