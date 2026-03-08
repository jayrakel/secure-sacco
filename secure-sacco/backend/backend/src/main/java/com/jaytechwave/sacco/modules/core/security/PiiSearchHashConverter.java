package com.jaytechwave.sacco.modules.core.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * JPA {@link AttributeConverter} that stores a deterministic HMAC-SHA256 hash
 * of a PII field to enable exact-match database searches without exposing the
 * plaintext or decrypting data at query time.
 *
 * <h3>Usage pattern</h3>
 * For each encrypted PII field that needs to be searchable, add a companion
 * hash column:
 *
 * <pre>{@code
 * // In the entity — the encrypted value (for display/business use)
 * @Convert(converter = EncryptedStringConverter.class)
 * @Column(name = "national_id", length = 512)
 * private String nationalId;
 *
 * // The searchable hash (for repository queries)
 * @Convert(converter = PiiSearchHashConverter.class)
 * @Column(name = "national_id_hash", length = 88)
 * private String nationalIdHash;
 * }</pre>
 *
 * <pre>{@code
 * // In the repository
 * Optional<Member> findByNationalIdHash(String nationalIdHash);
 * }</pre>
 *
 * <h3>Key management</h3>
 * Uses a separate HMAC key from {@code APP_PII_HMAC_KEY} (Base64-encoded 32 bytes).
 * This key is distinct from the AES encryption key to follow key separation principles.
 */
@Slf4j
@Component
@Converter
public class PiiSearchHashConverter implements AttributeConverter<String, String> {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final byte[] hmacKey;

    public PiiSearchHashConverter(
            @Value("${app.pii-hmac-key}") String base64HmacKey) {

        this.hmacKey = Base64.getDecoder().decode(base64HmacKey);
        if (this.hmacKey.length < 16) {
            throw new IllegalArgumentException(
                    "APP_PII_HMAC_KEY must be at least 128 bits. " +
                            "Generate with: openssl rand -base64 32");
        }
        log.info("PiiSearchHashConverter initialised (HMAC-SHA256).");
    }

    @Override
    public String convertToDatabaseColumn(String plaintext) {
        if (plaintext == null) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(hmacKey, HMAC_ALGORITHM));
            byte[] hash = mac.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute PII search hash", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String stored) {
        // Hash is stored as-is; this converter is write-through only.
        return stored;
    }
}