package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.core.notifications.EmailNotificationService;
import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import com.jaytechwave.sacco.modules.users.domain.entity.PasswordResetToken;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.PasswordResetTokenRepository;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class PasswordResetService {

    private static final int DEFAULT_EXPIRY_MINUTES = 15;

    private final UserRepository               userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PiiSearchHashConverter       piiSearchHashConverter;
    private final PasswordEncoder              passwordEncoder;
    private final PasswordValidator            passwordValidator;
    private final EmailNotificationService     emailNotificationService;
    private final SaccoSettingsService         settingsService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Autowired
    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PiiSearchHashConverter piiSearchHashConverter,
            PasswordEncoder passwordEncoder,
            PasswordValidator passwordValidator,
            EmailNotificationService emailNotificationService,
            @Lazy SaccoSettingsService settingsService) {
        this.userRepository           = userRepository;
        this.tokenRepository          = tokenRepository;
        this.piiSearchHashConverter   = piiSearchHashConverter;
        this.passwordEncoder          = passwordEncoder;
        this.passwordValidator        = passwordValidator;
        this.emailNotificationService = emailNotificationService;
        this.settingsService          = settingsService;
    }

    private int expiryMinutes() {
        try { int v = settingsService.getPasswordResetExpiryMin(); return v > 0 ? v : DEFAULT_EXPIRY_MINUTES; }
        catch (Exception e) { return DEFAULT_EXPIRY_MINUTES; }
    }

    @Transactional
    public void generatePasswordResetToken(String email) {
        String phoneHash = piiSearchHashConverter.convertToDatabaseColumn(email);
        Optional<User> userOpt = userRepository.findByEmailOrPhoneNumberHash(email, phoneHash);
        if (userOpt.isEmpty()) {
            log.info("Password reset requested for non-existent account: {}", email);
            return;
        }
        User user = userOpt.get();
        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .expiryDate(Instant.now().plus(expiryMinutes(), ChronoUnit.MINUTES))
                .used(false)
                .build();

        tokenRepository.save(resetToken);
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        emailNotificationService.sendPasswordResetEmail(user.getEmail(), resetUrl);
        log.info("Password reset email dispatched to {}", user.getEmail());
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired token"));

        if (resetToken.isUsed() || resetToken.getExpiryDate().isBefore(Instant.now()))
            throw new IllegalArgumentException("Invalid or expired token");

        if (!passwordValidator.isValid(newPassword))
            throw new IllegalArgumentException(passwordValidator.getRequirementsMessage());

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
        log.info("Password successfully reset for user: {}", user.getEmail());
    }
}