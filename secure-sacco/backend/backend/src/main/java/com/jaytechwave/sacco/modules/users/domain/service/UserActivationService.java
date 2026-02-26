package com.jaytechwave.sacco.modules.users.domain.service;

import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.entity.VerificationToken;
import com.jaytechwave.sacco.modules.users.domain.entity.VerificationTokenType;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.users.domain.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.ZonedDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserActivationService {

    private final UserRepository userRepository;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Called automatically when a new member is registered to generate both tokens instantly.
     */
    @Transactional
    public void initiateActivation(User user) {
        if (user.getStatus() != UserStatus.PENDING_ACTIVATION) return;
        generateOtp(user);
        generateEmailToken(user);
    }

    // --- Frontend Integration Methods ---

    /**
     * Validates the email token when the user first clicks the link from their email.
     */
    @Transactional(readOnly = true)
    public void verifyActivationLink(String tokenString) {
        VerificationToken token = tokenRepository.findByTokenAndTokenTypeAndIsUsedFalse(tokenString, VerificationTokenType.EMAIL_ACTIVATION)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired activation link."));

        if (token.getExpiryDate().isBefore(ZonedDateTime.now())) {
            throw new IllegalArgumentException("Activation link has expired. Please contact support.");
        }
    }

    /**
     * Completes the activation by verifying the OTP, Email Token, and setting the password simultaneously.
     */
    @Transactional
    public void completeActivation(String emailTokenString, String otpCode, String newPassword) {
        // 1. Verify Email Token
        VerificationToken emailToken = tokenRepository.findByTokenAndTokenTypeAndIsUsedFalse(emailTokenString, VerificationTokenType.EMAIL_ACTIVATION)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired email token."));

        validateToken(emailToken, emailTokenString);
        User user = emailToken.getUser();

        // 2. Verify OTP
        VerificationToken otpToken = tokenRepository.findFirstByUserIdAndTokenTypeAndIsUsedFalseOrderByCreatedAtDesc(user.getId(), VerificationTokenType.PHONE_ACTIVATION)
                .orElseThrow(() -> new IllegalArgumentException("No active OTP found. Please request a new one."));

        validateToken(otpToken, otpCode);

        // 3. Mark both used
        emailToken.setUsed(true);
        otpToken.setUsed(true);
        tokenRepository.save(emailToken);
        tokenRepository.save(otpToken);

        // 4. Finalize User Setup
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        log.info("🎉 User {} is now fully activated.", user.getEmail());
    }

    // --- Individual Retry Methods ---

    @Transactional
    public void requestNewOtp(String email) {
        generateOtp(findUserByEmail(email));
    }

    @Transactional
    public void requestNewEmailToken(String email) {
        generateEmailToken(findUserByEmail(email));
    }

    // --- Internal Helpers ---

    private void generateOtp(User user) {
        enforceRateLimit(user, VerificationTokenType.PHONE_ACTIVATION);
        String code = String.format("%06d", new SecureRandom().nextInt(999999));

        VerificationToken token = VerificationToken.builder()
                .user(user).token(code).tokenType(VerificationTokenType.PHONE_ACTIVATION)
                .expiryDate(ZonedDateTime.now().plusMinutes(10)).build();
        tokenRepository.save(token);

        log.info("📢 [MOCK SMS] OTP for {}: {}", user.getPhoneNumber() != null ? user.getPhoneNumber() : "User", code);
    }

    private void generateEmailToken(User user) {
        enforceRateLimit(user, VerificationTokenType.EMAIL_ACTIVATION);
        String uuidToken = UUID.randomUUID().toString();

        VerificationToken token = VerificationToken.builder()
                .user(user).token(uuidToken).tokenType(VerificationTokenType.EMAIL_ACTIVATION)
                .expiryDate(ZonedDateTime.now().plusHours(24)).build();
        tokenRepository.save(token);

        log.info("📧 [MOCK EMAIL] Activation Link for {}: http://localhost:5173/activate?token={}", user.getEmail(), uuidToken);
    }

    private void validateToken(VerificationToken token, String inputCode) {
        if (token.getExpiryDate().isBefore(ZonedDateTime.now())) {
            token.setUsed(true);
            tokenRepository.save(token);
            throw new IllegalArgumentException("Token has expired. Please request a new one.");
        }
        if (!token.getToken().equals(inputCode)) {
            token.setAttempts(token.getAttempts() + 1);
            if (token.getAttempts() >= 3) {
                token.setUsed(true); // Lock the token after 3 failed tries
            }
            tokenRepository.save(token);
            throw new IllegalArgumentException("Invalid verification code.");
        }
    }

    private void enforceRateLimit(User user, VerificationTokenType type) {
        ZonedDateTime window = ZonedDateTime.now().minusMinutes(15);
        int recentRequests = tokenRepository.countByUserIdAndTokenTypeAndCreatedAtAfter(user.getId(), type, window);
        if (recentRequests >= 3) {
            throw new IllegalStateException("Too many requests. Please try again after 15 minutes.");
        }
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Account not found."));
    }
}