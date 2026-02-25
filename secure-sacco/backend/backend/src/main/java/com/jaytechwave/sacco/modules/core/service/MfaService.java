package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import dev.samstevens.totp.code.*;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import dev.samstevens.totp.util.Utils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MfaService {

    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;

    @Transactional
    public Map<String, String> generateMfaSetup(UUID userId) throws QrGenerationException {
        User user = userRepository.findById(userId).orElseThrow();

        String secret = user.getMfaSecret();

        // --- FIX: Only generate a NEW secret if they don't already have a pending one ---
        if (secret == null || secret.isEmpty()) {
            SecretGenerator secretGenerator = new DefaultSecretGenerator();
            secret = secretGenerator.generate();

            // Save the new secret, but DO NOT enable MFA yet
            user.setMfaSecret(secret);
            userRepository.save(user);
        }

        QrData data = new QrData.Builder()
                .label(user.getEmail())
                .secret(secret)
                .issuer("Secure SACCO")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        QrGenerator generator = new ZxingPngQrGenerator();
        byte[] imageData = generator.generate(data);
        String mimeType = generator.getImageMimeType();
        String dataUri = Utils.getDataUriForImage(imageData, mimeType);

        return Map.of("secret", secret, "qrCode", dataUri);
    }

    @Transactional
    public void enableMfa(UUID userId, String code) {
        User user = userRepository.findById(userId).orElseThrow();
        if (user.isMfaEnabled()) {
            throw new IllegalStateException("MFA is already enabled");
        }
        if (!verifyCode(user.getMfaSecret(), code)) {
            throw new IllegalArgumentException("Invalid MFA code");
        }
        user.setMfaEnabled(true);
        userRepository.save(user);
    }

    @Transactional
    public void disableMfa(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow();
        user.setMfaEnabled(false);
        user.setMfaSecret(null); // Clear the secret so a new one is generated next time
        userRepository.save(user);
    }

    public boolean verifyCode(String secret, String code) {
        TimeProvider timeProvider = new SystemTimeProvider();
        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        DefaultCodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, timeProvider);

        verifier.setAllowedTimePeriodDiscrepancy(1);

        return verifier.isValidCode(secret, code);
    }

    // Stores a short-lived token linking to the user ID for the 2nd step of login
    public String createPreAuthToken(UUID userId) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set("mfa:auth:" + token, userId.toString(), Duration.ofMinutes(5));
        return token;
    }

    public UUID verifyPreAuthToken(String token) {
        String userIdStr = redisTemplate.opsForValue().get("mfa:auth:" + token);
        if (userIdStr == null) throw new IllegalArgumentException("Invalid or expired MFA token");
        return UUID.fromString(userIdStr);
    }

    public void clearPreAuthToken(String token) {
        redisTemplate.delete("mfa:auth:" + token);
    }
}