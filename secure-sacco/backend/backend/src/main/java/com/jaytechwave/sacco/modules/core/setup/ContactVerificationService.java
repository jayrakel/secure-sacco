package com.jaytechwave.sacco.modules.core.setup;

import com.jaytechwave.sacco.modules.core.notifications.EmailNotificationService;
import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.VerificationToken;
import com.jaytechwave.sacco.modules.users.domain.entity.VerificationTokenType;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.users.domain.repository.VerificationTokenRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Handles email and phone OTP verification for ACTIVE users.
 * All limits are loaded dynamically from {@link SaccoSettingsService}.
 */
@Slf4j
@Service
public class ContactVerificationService {

    // Safe fallback defaults used before SACCO is initialized
    private static final int DEFAULT_EMAIL_EXPIRY_HOURS    = 24;
    private static final int DEFAULT_OTP_EXPIRY_MINUTES    = 10;
    private static final int DEFAULT_RATE_LIMIT_WINDOW_MIN = 15;
    private static final int DEFAULT_RATE_LIMIT_MAX        = 3;

    private final UserRepository              userRepository;
    private final VerificationTokenRepository tokenRepository;
    private final EmailNotificationService    emailNotificationService;
    private final SaccoSettingsService        settingsService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Autowired
    public ContactVerificationService(
            UserRepository userRepository,
            VerificationTokenRepository tokenRepository,
            EmailNotificationService emailNotificationService,
            @Lazy SaccoSettingsService settingsService) {
        this.userRepository           = userRepository;
        this.tokenRepository          = tokenRepository;
        this.emailNotificationService = emailNotificationService;
        this.settingsService          = settingsService;
    }

    // ── Dynamic settings helpers ──────────────────────────────────────────────

    private int emailExpiryHours() {
        try { int v = settingsService.getEmailVerifyExpiryHours(); return v > 0 ? v : DEFAULT_EMAIL_EXPIRY_HOURS; }
        catch (Exception e) { return DEFAULT_EMAIL_EXPIRY_HOURS; }
    }

    private int rateLimitMax() {
        try { int v = settingsService.getContactVerifyRateLimit(); return v > 0 ? v : DEFAULT_RATE_LIMIT_MAX; }
        catch (Exception e) { return DEFAULT_RATE_LIMIT_MAX; }
    }

    private int rateLimitWindowMin() {
        try { int v = settingsService.getContactVerifyWindowMin(); return v > 0 ? v : DEFAULT_RATE_LIMIT_WINDOW_MIN; }
        catch (Exception e) { return DEFAULT_RATE_LIMIT_WINDOW_MIN; }
    }

    // ── Email verification ────────────────────────────────────────────────────

    @Transactional
    public void sendEmailOtp(String email) {
        User user = requireUser(email);
        if (user.isEmailVerified()) return;
        enforceRateLimit(user, VerificationTokenType.EMAIL_VERIFICATION);

        String token = UUID.randomUUID().toString();
        tokenRepository.save(VerificationToken.builder()
                .user(user)
                .token(token)
                .tokenType(VerificationTokenType.EMAIL_VERIFICATION)
                .expiryDate(ZonedDateTime.now().plusHours(emailExpiryHours()))
                .build());

        String verificationUrl = frontendUrl + "/verify-contact?type=email&token=" + token;
        emailNotificationService.sendContactVerificationEmail(email, verificationUrl);
        log.info("Email verification link dispatched to {}", email);
    }

    @Transactional
    public void confirmEmail(String email, String token) {
        User user = requireUser(email);
        VerificationToken vt = requireToken(token, VerificationTokenType.EMAIL_VERIFICATION, user);
        vt.setUsed(true);
        tokenRepository.save(vt);
        user.setEmailVerified(true);
        userRepository.save(user);
        log.info("Email verified for {}", email);
    }

    // ── Phone / OTP verification ──────────────────────────────────────────────

    public void sendPhoneOtp(String email) {
        // Phone verification disabled — Africa's Talking SMS not yet configured.
        log.info("[SMS-DISABLED] Phone verification skipped for {} — configure Africa's Talking to enable.", email);
    }

    @Transactional
    public void confirmPhone(String email, String otp) {
        User user = requireUser(email);
        VerificationToken vt = tokenRepository
                .findFirstByUserIdAndTokenTypeAndIsUsedFalseOrderByCreatedAtDesc(
                        user.getId(), VerificationTokenType.PHONE_VERIFICATION)
                .orElseThrow(() -> new IllegalArgumentException("No active OTP found. Please request a new code."));

        validateToken(vt, otp);
        vt.setUsed(true);
        tokenRepository.save(vt);
        user.setPhoneVerified(true);
        userRepository.save(user);
        log.info("Phone verified for {}", email);
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
        if (!vt.getUser().getId().equals(user.getId()))
            throw new IllegalArgumentException("Token does not belong to this account.");
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
            if (token.getAttempts() >= 3) token.setUsed(true);
            tokenRepository.save(token);
            throw new IllegalArgumentException("Incorrect verification code.");
        }
    }

    private void enforceRateLimit(User user, VerificationTokenType type) {
        ZonedDateTime window = ZonedDateTime.now().minusMinutes(rateLimitWindowMin());
        int count = tokenRepository.countByUserIdAndTokenTypeAndCreatedAtAfter(user.getId(), type, window);
        if (count >= rateLimitMax()) {
            throw new IllegalStateException(
                    "Too many requests. Please wait " + rateLimitWindowMin() + " minutes and try again.");
        }
    }
}