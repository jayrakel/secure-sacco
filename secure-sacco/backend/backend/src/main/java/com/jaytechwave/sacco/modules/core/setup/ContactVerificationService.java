package com.jaytechwave.sacco.modules.core.setup;

import com.jaytechwave.sacco.modules.core.notifications.EmailNotificationService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.VerificationToken;
import com.jaytechwave.sacco.modules.users.domain.entity.VerificationTokenType;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.users.domain.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.Random;
import java.util.UUID;

/**
 * Handles email and phone OTP verification for ACTIVE users.
 *
 * <p>This is distinct from {@code UserActivationService}, which handles
 * the new-user activation flow (PENDING_ACTIVATION → ACTIVE with password-set).
 * This service verifies contacts for users who are already ACTIVE but whose
 * {@code email_verified} / {@code phone_verified} flags are still false —
 * which happens for the bootstrap SYSTEM_ADMIN and for any staff user whose
 * admin created their account without going through the activation link flow.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContactVerificationService {

    private static final int OTP_EXPIRY_MINUTES   = 10;
    private static final int EMAIL_EXPIRY_HOURS   = 24;
    private static final int RATE_LIMIT_WINDOW_MIN = 15;
    private static final int RATE_LIMIT_MAX        = 3;

    private final UserRepository              userRepository;
    private final VerificationTokenRepository tokenRepository;
    private final EmailNotificationService    emailNotificationService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    // ── Email verification ────────────────────────────────────────────────────

    /**
     * Generates a one-time email verification link token and logs it (mock).
     * In production, replace the log.info with your email service call.
     */
    @Transactional
    public void sendEmailOtp(String email) {
        User user = requireUser(email);
        if (user.isEmailVerified()) return; // already verified, no-op
        enforceRateLimit(user, VerificationTokenType.EMAIL_VERIFICATION);

        String token = UUID.randomUUID().toString();
        tokenRepository.save(VerificationToken.builder()
                .user(user)
                .token(token)
                .tokenType(VerificationTokenType.EMAIL_VERIFICATION)
                .expiryDate(ZonedDateTime.now().plusHours(EMAIL_EXPIRY_HOURS))
                .build());

        String verificationUrl = frontendUrl + "/verify-contact?type=email&token=" + token;
        emailNotificationService.sendContactVerificationEmail(email, verificationUrl);
        log.info("📧 Email verification link dispatched to {}", email);
    }

    /**
     * Confirms the email verification token and marks the user's email as verified.
     */
    @Transactional
    public void confirmEmail(String email, String token) {
        User user = requireUser(email);
        VerificationToken vt = requireToken(token, VerificationTokenType.EMAIL_VERIFICATION, user);

        vt.setUsed(true);
        tokenRepository.save(vt);
        user.setEmailVerified(true);
        userRepository.save(user);
        log.info("✅ Email verified for {}", email);
    }

    // ── Phone / OTP verification ──────────────────────────────────────────────

    /**
     * Generates a 6-digit OTP and logs it (mock).
     * In production, replace the log.info with your SMS/Daraja service call.
     */
//    @Transactional
//    public void sendPhoneOtp(String email) {
//        User user = requireUser(email);
//        if (user.isPhoneVerified()) return; // already verified, no-op
//        enforceRateLimit(user, VerificationTokenType.PHONE_VERIFICATION);
//
//        String code = String.format("%06d", new Random().nextInt(1_000_000));
//        tokenRepository.save(VerificationToken.builder()
//                .user(user)
//                .token(code)
//                .tokenType(VerificationTokenType.PHONE_VERIFICATION)
//                .expiryDate(ZonedDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES))
//                .build());
//
//        // 📱 SMS delivery deferred to v2 — integrate Africa's Talking / Twilio here.
//        // For initial setup, the OTP appears in server logs so the admin can complete verification.
//        log.info("📱 [SMS-PENDING] Phone OTP for {} ({}): {} — configure Africa's Talking in v2.",
//                email, user.getPhoneNumber() != null ? user.getPhoneNumber() : "no-phone", code);
//    }

    public void sendPhoneOtp(String email) {
        // 📱 Phone verification disabled — Africa's Talking SMS not yet configured.
        // Re-enable by removing this return statement and configuring AT credentials.
        log.info("📱 [SMS-DISABLED] Phone verification skipped for {} — configure Africa's Talking to enable.", email);
        return;
    }

    /**
     * Confirms the phone OTP and marks the user's phone as verified.
     */
    @Transactional
    public void confirmPhone(String email, String otp) {
        User user = requireUser(email);
        VerificationToken vt = tokenRepository
                .findFirstByUserIdAndTokenTypeAndIsUsedFalseOrderByCreatedAtDesc(
                        user.getId(), VerificationTokenType.PHONE_VERIFICATION)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No active OTP found. Please request a new code."));

        validateToken(vt, otp);
        vt.setUsed(true);
        tokenRepository.save(vt);
        user.setPhoneVerified(true);
        userRepository.save(user);
        log.info("✅ Phone verified for {}", email);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User requireUser(String email) {
        return userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Account not found."));
    }

    private VerificationToken requireToken(String rawToken, VerificationTokenType type, User user) {
        VerificationToken vt = tokenRepository
                .findByTokenAndTokenTypeAndIsUsedFalse(rawToken, type)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification token."));
        if (!vt.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Token does not belong to this account.");
        }
        validateToken(vt, rawToken);
        return vt;
    }

    private void validateToken(VerificationToken token, String input) {
        if (token.getExpiryDate().isBefore(ZonedDateTime.now())) {
            token.setUsed(true);
            tokenRepository.save(token);
            throw new IllegalArgumentException("Verification code has expired. Please request a new one.");
        }
        if (!token.getToken().equals(input)) {
            token.setAttempts(token.getAttempts() + 1);
            if (token.getAttempts() >= 3) {
                token.setUsed(true); // lock after 3 bad attempts
            }
            tokenRepository.save(token);
            throw new IllegalArgumentException("Incorrect verification code.");
        }
    }

    private void enforceRateLimit(User user, VerificationTokenType type) {
        ZonedDateTime window = ZonedDateTime.now().minusMinutes(RATE_LIMIT_WINDOW_MIN);
        int count = tokenRepository.countByUserIdAndTokenTypeAndCreatedAtAfter(user.getId(), type, window);
        if (count >= RATE_LIMIT_MAX) {
            throw new IllegalStateException(
                    "Too many requests. Please wait " + RATE_LIMIT_WINDOW_MIN + " minutes and try again.");
        }
    }
}