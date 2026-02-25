package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.users.domain.entity.PasswordResetToken;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.PasswordResetTokenRepository;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordValidator passwordValidator;

    @Transactional
    public void generatePasswordResetToken(String email) {
        Optional<User> userOpt = userRepository.findByEmailOrPhoneNumber(email);
        if (userOpt.isEmpty()) {
            // Silently return to prevent user enumeration attacks
            log.info("Password reset requested for non-existent account: {}", email);
            return;
        }

        User user = userOpt.get();
        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .expiryDate(Instant.now().plus(15, ChronoUnit.MINUTES))
                .used(false)
                .build();

        tokenRepository.save(resetToken);

        // MOCK EMAIL SEND
        log.info("\n=======================================================\n" +
                "MOCK EMAIL: Password Reset Requested\n" +
                "To: {}\n" +
                "Link: http://localhost:5173/reset-password?token={}\n" +
                "=======================================================", email, token);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired token"));

        if (resetToken.isUsed() || resetToken.getExpiryDate().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Invalid or expired token");
        }

        if (!passwordValidator.isValid(newPassword)) {
            throw new IllegalArgumentException(passwordValidator.getRequirementsMessage());
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalidate token
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        log.info("Password successfully reset for user: {}", user.getEmail());
    }
}