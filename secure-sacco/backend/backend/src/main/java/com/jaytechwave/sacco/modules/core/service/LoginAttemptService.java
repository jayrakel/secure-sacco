package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Tracks failed login attempts per identifier (email / IP) using Redis counters.
 *
 * <p>Limits are loaded dynamically from {@link SaccoSettingsService} so that the
 * system admin can adjust them via the settings panel without a server restart.
 * Safe fallback defaults are used when settings are unavailable (e.g. before the
 * SACCO is initialized).</p>
 */
@Service
public class LoginAttemptService {

    // ── Fallback constants (used before SACCO settings are initialized) ────────
    private static final int      DEFAULT_MAX_ATTEMPTS     = 5;
    private static final Duration DEFAULT_LOCKOUT_DURATION = Duration.ofMinutes(15);

    private static final String ATTEMPTS_PREFIX = "auth:attempts:";
    private static final String LOCKOUT_PREFIX  = "auth:lockout:";

    private final StringRedisTemplate  redisTemplate;
    private final SaccoSettingsService settingsService;

    @Autowired
    public LoginAttemptService(
            StringRedisTemplate redisTemplate,
            @Lazy SaccoSettingsService settingsService) {
        this.redisTemplate  = redisTemplate;
        this.settingsService = settingsService;
    }

    // ── Dynamic getters ───────────────────────────────────────────────────────

    private int maxAttempts() {
        try {
            int v = settingsService.getMaxLoginAttempts();
            return v > 0 ? v : DEFAULT_MAX_ATTEMPTS;
        } catch (Exception e) {
            return DEFAULT_MAX_ATTEMPTS;
        }
    }

    private Duration lockoutDuration() {
        try {
            int minutes = settingsService.getLockoutDurationMinutes();
            return minutes > 0 ? Duration.ofMinutes(minutes) : DEFAULT_LOCKOUT_DURATION;
        } catch (Exception e) {
            return DEFAULT_LOCKOUT_DURATION;
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public void loginSucceeded(String key) {
        redisTemplate.delete(ATTEMPTS_PREFIX + key);
        redisTemplate.delete(LOCKOUT_PREFIX  + key);
    }

    public void loginFailed(String key) {
        String attemptsKey = ATTEMPTS_PREFIX + key;
        String lockoutKey  = LOCKOUT_PREFIX  + key;

        Long attempts = redisTemplate.opsForValue().increment(attemptsKey);
        if (attempts == null) attempts = 1L;

        // On first failure start a 1-hour rolling window for the counter
        if (attempts == 1) {
            redisTemplate.expire(attemptsKey, Duration.ofHours(1));
        }

        if (attempts >= maxAttempts()) {
            redisTemplate.opsForValue().set(lockoutKey, "LOCKED", lockoutDuration());
            redisTemplate.delete(attemptsKey);
        }
    }

    public boolean isBlocked(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(LOCKOUT_PREFIX + key));
    }

    public long getRemainingLockoutTimeSeconds(String key) {
        Long expire = redisTemplate.getExpire(LOCKOUT_PREFIX + key);
        return expire != null && expire > 0 ? expire : 0;
    }
}