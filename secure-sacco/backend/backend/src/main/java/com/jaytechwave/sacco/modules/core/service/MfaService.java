package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Service
public class MfaService {

    private static final int DEFAULT_TOKEN_EXPIRY_MINUTES = 5;

    private final UserRepository       userRepository;
    private final StringRedisTemplate  redisTemplate;
    private final SaccoSettingsService settingsService;
    private final com.jaytechwave.sacco.modules.core.notifications.SmsNotificationService smsNotificationService;
    private final com.jaytechwave.sacco.modules.core.notifications.EmailNotificationService emailNotificationService;

    @Autowired
    public MfaService(
            UserRepository userRepository,
            StringRedisTemplate redisTemplate,
            @Lazy SaccoSettingsService settingsService,
            com.jaytechwave.sacco.modules.core.notifications.SmsNotificationService smsNotificationService,
            com.jaytechwave.sacco.modules.core.notifications.EmailNotificationService emailNotificationService) {
        this.userRepository  = userRepository;
        this.redisTemplate   = redisTemplate;
        this.settingsService = settingsService;
        this.smsNotificationService = smsNotificationService;
        this.emailNotificationService = emailNotificationService;
    }

    private int tokenExpiryMinutes() {
        try {
            int v = settingsService.getMfaTokenExpiryMinutes();
            return v > 0 ? v : DEFAULT_TOKEN_EXPIRY_MINUTES;
        } catch (Exception e) {
            return DEFAULT_TOKEN_EXPIRY_MINUTES;
        }
    }

    // ── TOTP setup & verification ─────────────────────────────────────────────

    @Transactional
    public Map<String, String> generateMfaSetup(UUID userId) throws QrGenerationException {
        User user = userRepository.findById(userId).orElseThrow();

        String secret = user.getMfaSecret();
        if (secret == null || secret.isEmpty()) {
            SecretGenerator secretGenerator = new DefaultSecretGenerator();
            secret = secretGenerator.generate();
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
        String mimeType  = generator.getImageMimeType();
        String dataUri   = Utils.getDataUriForImage(imageData, mimeType);

        return Map.of("secret", secret, "qrCode", dataUri);
    }

    @Transactional
    public void enableMfa(UUID userId, String code, com.jaytechwave.sacco.modules.users.domain.entity.MfaMethod method) {
        User user = userRepository.findById(userId).orElseThrow();
        if (user.isMfaEnabled()) throw new IllegalStateException("MFA is already enabled");
        
        boolean isValid = false;
        if (method == com.jaytechwave.sacco.modules.users.domain.entity.MfaMethod.TOTP) {
            isValid = verifyCode(user.getMfaSecret(), code);
        } else {
            isValid = verifyDispatchedCode(userId, code);
        }
        
        if (!isValid) throw new IllegalArgumentException("Invalid MFA code");
        
        user.setMfaEnabled(true);
        user.setMfaMethod(method);
        userRepository.save(user);
    }

    @Transactional
    public void disableMfa(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow();
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);
    }

    public boolean verifyCode(String secret, String code) {
        TimeProvider timeProvider = new SystemTimeProvider();
        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        DefaultCodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
        verifier.setAllowedTimePeriodDiscrepancy(1);
        return verifier.isValidCode(secret, code);
    }

    // ── Pre-auth token (step 2 of MFA login flow) ─────────────────────────────

    public String createPreAuthToken(UUID userId) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(
                "mfa:auth:" + token,
                userId.toString(),
                Duration.ofMinutes(tokenExpiryMinutes()));
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
    
    // ── Dispatch (SMS/Email/WhatsApp) MFA ──────────────────────────────────────

    public void dispatchMfaCode(User user) {
        if (user.getMfaMethod() == com.jaytechwave.sacco.modules.users.domain.entity.MfaMethod.TOTP) {
            return; // TOTP doesn't require dispatch
        }

        // Generate 6-digit code
        String code = String.format("%06d", new java.util.Random().nextInt(999999));
        
        // Store in Redis (Valid for 5 mins)
        redisTemplate.opsForValue().set(
                "mfa:code:" + user.getId().toString(),
                code,
                Duration.ofMinutes(tokenExpiryMinutes())
        );

        String message = "Your Secure SACCO verification code is: " + code + ". Valid for " + tokenExpiryMinutes() + " minutes.";

        switch (user.getMfaMethod()) {
            case SMS:
                smsNotificationService.sendOtp(user.getPhoneNumber(), code);
                break;
            case EMAIL:
                emailNotificationService.sendMfaEmail(user.getEmail(), code);
                break;
            case WHATSAPP:
                System.out.println("Dispatching WhatsApp to " + user.getPhoneNumber() + ": " + code);
                break;
            default:
                throw new IllegalStateException("Unsupported MFA method");
        }
    }

    public boolean verifyDispatchedCode(UUID userId, String code) {
        String storedCode = redisTemplate.opsForValue().get("mfa:code:" + userId.toString());
        if (storedCode != null && storedCode.equals(code)) {
            redisTemplate.delete("mfa:code:" + userId.toString());
            return true;
        }
        return false;
    }
}