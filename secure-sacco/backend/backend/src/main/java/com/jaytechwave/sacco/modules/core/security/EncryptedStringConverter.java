package com.jaytechwave.sacco.modules.core.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * JPA {@link AttributeConverter} that transparently encrypts and decrypts
 * sensitive string fields using AES-256-GCM.
 *
 * <h3>Usage</h3>
 * <pre>{@code
 * @Convert(converter = EncryptedStringConverter.class)
 * @Column(name = "national_id", length = 512)
 * private String nationalId;
 * }</pre>
 *
 * <h3>Key management</h3>
 * The encryption key is read from the {@code APP_FIELD_ENCRYPTION_KEY} environment
 * variable. The key must be a Base64-encoded 256-bit (32-byte) value.
 *
 * <p>Generate a key with: {@code openssl rand -base64 32}</p>
 *
 * <h3>Storage format</h3>
 * Stored in the database as: {@code Base64(IV) + ":" + Base64(ciphertext + tag)}
 * The IV is randomly generated per encryption to guarantee ciphertext uniqueness
 * even for identical plaintext values.
 *
 * <h3>Search impact</h3>
 * Because each encryption uses a random IV, the same plaintext produces different
 * ciphertext on every call. SQL LIKE/= queries on encrypted columns will not work.
 * Use the companion {@link PiiSearchHashConverter} for exact-match search fields.
 */
@Slf4j
@Component
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_IV_LENGTH_BYTES = 12;  // 96-bit IV — NIST recommended

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public EncryptedStringConverter(
            @Value("${app.field-encryption-key}") String base64Key) {

        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        if (keyBytes.length != 32) {
            throw new IllegalArgumentException(
                    "APP_FIELD_ENCRYPTION_KEY must be a Base64-encoded 256-bit (32-byte) AES key. " +
                            "Generate one with: openssl rand -base64 32");
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
        log.info("EncryptedStringConverter initialised (AES-256-GCM).");
    }

    @Override
    public String convertToDatabaseColumn(String plaintext) {
        if (plaintext == null) {
            return null;
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            // Store as: Base64(iv) : Base64(ciphertext+tag)
            return Base64.getEncoder().encodeToString(iv)
                    + ":"
                    + Base64.getEncoder().encodeToString(ciphertext);

        } catch (Exception e) {
            throw new EncryptionException("Failed to encrypt field value", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String stored) {
        if (stored == null) {
            return null;
        }
        try {
            String[] parts = stored.split(":", 2);
            if (parts.length != 2) {
                throw new IllegalArgumentException("Invalid encrypted field format: missing IV separator");
            }

            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[1]);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, java.nio.charset.StandardCharsets.UTF_8);

        } catch (Exception e) {
            throw new EncryptionException("Failed to decrypt field value. " +
                    "Check that APP_FIELD_ENCRYPTION_KEY matches the key used to encrypt.", e);
        }
    }

    /** Unchecked wrapper for encryption/decryption failures. */
    public static class EncryptionException extends RuntimeException {
        public EncryptionException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}