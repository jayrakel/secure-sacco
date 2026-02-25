package com.jaytechwave.sacco.modules.core.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    private static final String ATTEMPTS_PREFIX = "auth:attempts:";
    private static final String LOCKOUT_PREFIX = "auth:lockout:";

    private final StringRedisTemplate redisTemplate;

    public LoginAttemptService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void loginSucceeded(String key) {
        redisTemplate.delete(ATTEMPTS_PREFIX + key);
        redisTemplate.delete(LOCKOUT_PREFIX + key);
    }

    public void loginFailed(String key) {
        String attemptsKey = ATTEMPTS_PREFIX + key;
        String lockoutKey = LOCKOUT_PREFIX + key;

        Long attempts = redisTemplate.opsForValue().increment(attemptsKey);
        if (attempts == null) attempts = 1L;

        // If it's their first failure, set an expiration on the attempts counter (e.g., 1 hour window)
        if (attempts == 1) {
            redisTemplate.expire(attemptsKey, Duration.ofHours(1));
        }

        // If they hit the max, lock them out and clear the counter
        if (attempts >= MAX_ATTEMPTS) {
            redisTemplate.opsForValue().set(lockoutKey, "LOCKED", LOCKOUT_DURATION);
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