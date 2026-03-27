package com.jaytechwave.sacco.modules.core.notifications;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends transactional emails via the Resend HTTP API (https://resend.com).
 *
 * <p>Uses HTTPS (port 443) instead of SMTP — works on Digital Ocean droplets
 * where all SMTP ports (25, 465, 587) are blocked by default.
 *
 * <p>All sends are {@code @Async} so they never block the calling request thread.
 *
 * <p>Configure via environment variables:
 * <pre>
 *   RESEND_API_KEY  — API key from resend.com dashboard
 *   MAIL_FROM       — Verified sender address (e.g. noreply@jaytechwavesolutions.co.ke)
 * </pre>
 */
@Slf4j
@Service
public class EmailNotificationService {

    private final Resend resend;
    private final String fromAddress;

    public EmailNotificationService(
            @Value("${resend.api-key:}") String apiKey,
            @Value("${spring.mail.from:noreply@jaytechwavesolutions.co.ke}") String fromAddress
    ) {
        this.resend = new Resend(apiKey);
        this.fromAddress = fromAddress;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    @Async
    public void sendActivationEmail(String toEmail, String activationUrl, String otpCode) {
        send(toEmail, "Activate Your SACCO Account", buildActivationBody(activationUrl, otpCode));
    }

    @Async
    public void sendContactVerificationEmail(String toEmail, String verificationUrl) {
        send(toEmail, "Verify Your Email Address", buildContactVerificationBody(verificationUrl));
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String resetUrl) {
        send(toEmail, "Reset Your Password", buildPasswordResetBody(resetUrl));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void send(String to, String subject, String htmlBody) {
        try {
            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(fromAddress)
                    .to(to)
                    .subject(subject)
                    .html(htmlBody)
                    .build();

            var response = resend.emails().send(params);
            log.info("📧 Email sent to {} — subject: {} — id: {}", to, subject, response.getId());
        } catch (ResendException e) {
            log.error("📧 Failed to send email to {} — subject: {} — error: {}", to, subject, e.getMessage(), e);
        }
    }

    private String buildActivationBody(String activationUrl, String otpCode) {
        return """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
                  <h2 style="color:#059669;">Welcome to the SACCO Portal</h2>
                  <p>Your account has been created. To activate it, click the link below and enter your One-Time Password when prompted.</p>
                  <p style="margin:24px 0;">
                    <a href="%s"
                       style="background:#059669;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                      Activate My Account
                    </a>
                  </p>
                  <p>Your One-Time Password (OTP):</p>
                  <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#1e293b;">%s</p>
                  <p style="color:#64748b;font-size:12px;">
                    This link expires in 24 hours. If you did not expect this email, please ignore it.
                  </p>
                </div>
                """.formatted(activationUrl, otpCode);
    }

    private String buildContactVerificationBody(String verificationUrl) {
        return """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
                  <h2 style="color:#059669;">Verify Your Email Address</h2>
                  <p>Please click the link below to verify your email address and complete your account setup.</p>
                  <p style="margin:24px 0;">
                    <a href="%s"
                       style="background:#059669;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                      Verify Email
                    </a>
                  </p>
                  <p style="color:#64748b;font-size:12px;">
                    This link expires in 24 hours. If you did not request this, please contact your system administrator.
                  </p>
                </div>
                """.formatted(verificationUrl);
    }

    private String buildPasswordResetBody(String resetUrl) {
        return """
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
                  <h2 style="color:#059669;">Password Reset Request</h2>
                  <p>We received a request to reset your password. Click the button below to set a new one.</p>
                  <p style="margin:24px 0;">
                    <a href="%s"
                       style="background:#059669;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                      Reset My Password
                    </a>
                  </p>
                  <p style="color:#64748b;font-size:12px;">
                    This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
                  </p>
                </div>
                """.formatted(resetUrl);
    }
}