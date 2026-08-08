package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.payments.domain.entity.PhoneNameCache;
import com.jaytechwave.sacco.modules.payments.domain.repository.PhoneNameCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhoneNameCacheService {

    private final PhoneNameCacheRepository phoneNameCacheRepository;
    
    private static final int MAX_CONFIDENCE = 5;
    private static final int TRUST_THRESHOLD = 2;
    private static final int EXPIRY_DAYS = 90;

    @Transactional
    public void updateCache(String phoneNumber, String senderName) {
        if (phoneNumber == null || phoneNumber.isBlank() || senderName == null || senderName.isBlank()) {
            return;
        }

        // Clean up inputs
        phoneNumber = phoneNumber.trim();
        senderName = senderName.trim().toUpperCase();

        Optional<PhoneNameCache> cacheOpt = phoneNameCacheRepository.findByPhoneNumber(phoneNumber);

        if (cacheOpt.isPresent()) {
            PhoneNameCache cache = cacheOpt.get();
            if (senderName.equalsIgnoreCase(cache.getSenderName())) {
                // Name matches, boost confidence
                cache.setConfidence(Math.min(cache.getConfidence() + 1, MAX_CONFIDENCE));
                cache.setLastSeenAt(LocalDateTime.now());
                log.debug("PhoneNameCache: Updated confidence for {} to {}", phoneNumber, cache.getConfidence());
            } else {
                // Name changed (likely recycled number or correction) - reset and overwrite
                log.info("PhoneNameCache: Name mismatch for {}. Old: {}, New: {}. Resetting confidence.",
                        phoneNumber, cache.getSenderName(), senderName);
                cache.setSenderName(senderName);
                cache.setConfidence(1);
                cache.setLastSeenAt(LocalDateTime.now());
            }
            phoneNameCacheRepository.save(cache);
        } else {
            // First time seeing this number
            PhoneNameCache newCache = PhoneNameCache.builder()
                    .phoneNumber(phoneNumber)
                    .senderName(senderName)
                    .confidence(1)
                    .lastSeenAt(LocalDateTime.now())
                    .build();
            phoneNameCacheRepository.save(newCache);
            log.info("PhoneNameCache: Created new entry for {} with name {}", phoneNumber, senderName);
        }
    }

    @Transactional(readOnly = true)
    public Optional<String> getName(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return Optional.empty();
        }

        Optional<PhoneNameCache> cacheOpt = phoneNameCacheRepository.findByPhoneNumber(phoneNumber.trim());
        
        if (cacheOpt.isEmpty()) {
            return Optional.empty();
        }

        PhoneNameCache cache = cacheOpt.get();

        // Check if expired (90 days)
        if (cache.getLastSeenAt().isBefore(LocalDateTime.now().minusDays(EXPIRY_DAYS))) {
            log.info("PhoneNameCache: Cache entry for {} has expired. Last seen at {}", phoneNumber, cache.getLastSeenAt());
            return Optional.empty();
        }

        // Check confidence threshold
        if (cache.getConfidence() >= TRUST_THRESHOLD) {
            log.debug("PhoneNameCache: Found highly confident name for {}: {}", phoneNumber, cache.getSenderName());
            return Optional.of(cache.getSenderName());
        }

        log.debug("PhoneNameCache: Name found for {} but confidence ({}) is below threshold.", phoneNumber, cache.getConfidence());
        return Optional.empty();
    }
}
