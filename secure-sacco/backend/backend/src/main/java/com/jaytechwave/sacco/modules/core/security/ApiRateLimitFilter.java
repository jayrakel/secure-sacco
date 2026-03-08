package com.jaytechwave.sacco.modules.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Redis-backed API rate limiter using a sliding-window counter approach.
 *
 * <p>Two tiers of limits are applied:</p>
 * <ol>
 *   <li><strong>General:</strong> 60 requests per user per minute for all API paths.</li>
 *   <li><strong>Financial endpoints:</strong> Stricter per-hour limits on high-value operations
 *       (STK push, loan applications, manual deposits).</li>
 * </ol>
 *
 * <p>Unauthenticated requests are not rate-limited by this filter (login brute-force
 * is already handled by {@code LoginAttemptService}).</p>
 *
 * <p>Rate limit state persists in Redis and survives application restarts.</p>
 */
@Slf4j
@Component
public class ApiRateLimitFilter extends OncePerRequestFilter {

    /** General API limit: requests per window. */
    private static final int GENERAL_LIMIT = 60;
    /** General API window duration. */
    private static final Duration GENERAL_WINDOW = Duration.ofMinutes(1);

    /**
     * Endpoint-specific limits: path prefix → {limit, window}.
     * Ordered from most to least specific so first match wins.
     */
    private static final Map<String, RateLimit> ENDPOINT_LIMITS = Map.of(
            "/api/v1/payments/mpesa/stk",       new RateLimit(5,  Duration.ofHours(1)),
            "/api/v1/loans/applications",        new RateLimit(3,  Duration.ofDays(1)),
            "/api/v1/savings/deposit/manual",    new RateLimit(20, Duration.ofHours(1)),
            "/api/v1/savings/withdraw/manual",   new RateLimit(10, Duration.ofHours(1))
    );

    private final StringRedisTemplate redis;

    public ApiRateLimitFilter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Only rate-limit authenticated users (unauthenticated → handled by brute-force protection)
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            filterChain.doFilter(request, response);
            return;
        }

        String userIdentifier = auth.getName();
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Only apply to mutating operations for endpoint-specific limits
        if ("GET".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 1. Check endpoint-specific stricter limit (wins if path matches) ──────
        for (Map.Entry<String, RateLimit> entry : ENDPOINT_LIMITS.entrySet()) {
            if (path.startsWith(entry.getKey())) {
                RateLimit limit = entry.getValue();
                String key = "rl:endpoint:" + userIdentifier + ":" + entry.getKey();
                if (isRateLimited(key, limit.maxRequests(), limit.window(), response)) {
                    return;
                }
                // Matched — skip general check for this request
                filterChain.doFilter(request, response);
                return;
            }
        }

        // ── 2. Apply general 60-req/min limit to everything else ─────────────────
        String generalKey = "rl:general:" + userIdentifier;
        if (isRateLimited(generalKey, GENERAL_LIMIT, GENERAL_WINDOW, response)) {
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Increments the Redis counter and returns {@code true} (+ writes 429 response)
     * if the limit has been exceeded.
     */
    private boolean isRateLimited(String key,
                                  int maxRequests,
                                  Duration window,
                                  HttpServletResponse response) throws IOException {

        Long count = redis.opsForValue().increment(key);

        if (count == null) {
            // Redis unavailable — fail open (don't block the user)
            log.warn("Redis unavailable for rate limit check on key: {}", key);
            return false;
        }

        if (count == 1) {
            // First request in this window — set TTL
            redis.expire(key, window.toSeconds(), TimeUnit.SECONDS);
        }

        if (count > maxRequests) {
            Long ttl = redis.getExpire(key, TimeUnit.SECONDS);
            long retryAfter = ttl != null && ttl > 0 ? ttl : window.toSeconds();

            log.warn("Rate limit exceeded for key: {} (count: {}, limit: {})", key, count, maxRequests);

            response.setStatus(429);
            response.setContentType("application/json");
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequests));
            response.setHeader("X-RateLimit-Remaining", "0");
            response.setHeader("X-RateLimit-Reset", String.valueOf(System.currentTimeMillis() / 1000 + retryAfter));
            response.getWriter().write(
                    "{\"error\":\"RATE_LIMIT_EXCEEDED\"," +
                            "\"message\":\"Too many requests. Please try again in " + retryAfter + " seconds.\"," +
                            "\"retryAfter\":" + retryAfter + "}"
            );
            return true;
        }

        return false;
    }

    /** Value type for endpoint-specific rate limit configuration. */
    private record RateLimit(int maxRequests, Duration window) {}
}