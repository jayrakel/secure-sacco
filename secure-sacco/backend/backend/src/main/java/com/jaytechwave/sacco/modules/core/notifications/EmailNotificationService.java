package com.jaytechwave.sacco.modules.core.notifications;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends transactional emails via the configured JavaMailSender (SMTP).
 *
 * <p>All sends are {@code @Async} so they never block the calling request thread.
 * Failures are logged as errors but do not propagate exceptions to callers —
 * the platform should handle retry / alerting at the infrastructure level
 * (e.g., dead-letter queue or log-based alerting).
 *
 * <p>Configure via environment variables (see application.yml spring.mail section):
 * <pre>
 *   MAIL_HOST      — SMTP server hostname   (e.g. smtp.sendgrid.net)
 *   MAIL_PORT      — SMTP port              (e.g. 587)
 *   MAIL_USERNAME  — SMTP auth username
 *   MAIL_PASSWORD  — SMTP auth password / API key
 *   MAIL_FROM      — Sender address         (e.g. noreply@yoursacco.co.ke)
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from}")
    private String fromAddress;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Sends the account activation email to a new member.
     *
     * @param toEmail       recipient email address
     * @param activationUrl full URL including the activation token
     * @param otpCode       6-digit OTP the member must enter on the activation page
     */
    @Async
    public void sendActivationEmail(String toEmail, String activationUrl, String otpCode) {
        String subject = "Activate Your SACCO Account";
        String body = buildActivationBody(activationUrl, otpCode);
        send(toEmail, subject, body);
    }

    /**
     * Sends the email-verification link to the SYSTEM_ADMIN during the setup wizard.
     *
     * @param toEmail           recipient email address
     * @param verificationUrl   full URL including the verification token
     */
    @Async
    public void sendContactVerificationEmail(String toEmail, String verificationUrl) {
        String subject = "Verify Your Email Address";
        String body = buildContactVerificationBody(verificationUrl);
        send(toEmail, subject, body);
    }

    /**
     * Sends a password-reset link.
     *
     * @param toEmail    recipient email address
     * @param resetUrl   full URL including the password-reset token
     */
    @Async
    public void sendPasswordResetEmail(String toEmail, String resetUrl) {
        String subject = "Reset Your Password";
        String body = buildPasswordResetBody(resetUrl);
        send(toEmail, subject, body);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void send(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("📧 Email sent to {} — subject: {}", to, subject);
        } catch (MessagingException e) {
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
