package com.jaytechwave.sacco.modules.core.security;

import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Redis-backed API rate limiter using a sliding-window counter approach.
 *
 * <p>Two tiers of limits:</p>
 * <ol>
 *   <li><b>General:</b> configurable requests per user per minute (default 60).
 *       Read dynamically from {@link SaccoSettingsService}.</li>
 *   <li><b>Financial endpoints:</b> Stricter per-hour limits on high-value operations.
 *       These are fixed for safety and not exposed in settings.</li>
 * </ol>
 *
 * <p>Unauthenticated requests are not rate-limited here — login brute-force is
 * handled by {@code LoginAttemptService}.</p>
 */
@Slf4j
@Component
public class ApiRateLimitFilter extends OncePerRequestFilter {

    // ── Fallback (before SACCO is initialized) ────────────────────────────────
    private static final int      DEFAULT_GENERAL_LIMIT  = 60;
    private static final Duration GENERAL_WINDOW         = Duration.ofMinutes(1);

    /**
     * Endpoint-specific limits that are fixed for security reasons and are NOT
     * exposed in admin settings (changing M-Pesa or loan limits carelessly could
     * create financial risk).
     */
    private static final Map<String, RateLimit> ENDPOINT_LIMITS = Map.of(
            "/api/v1/payments/mpesa/stk",       new RateLimit(5,  Duration.ofHours(1)),
            "/api/v1/loans/applications",        new RateLimit(3,  Duration.ofDays(1)),
            "/api/v1/savings/deposit/manual",    new RateLimit(20, Duration.ofHours(1)),
            "/api/v1/savings/withdraw/manual",   new RateLimit(10, Duration.ofHours(1))
    );

    private static final List<String> BYPASS_PREFIXES = List.of(
            "/api/v1/migration/",
            "/api/v1/loans/applications/refinance"
    );

    private final StringRedisTemplate  redis;
    private final SaccoSettingsService settingsService;

    @Autowired
    public ApiRateLimitFilter(StringRedisTemplate redis,
                              @Lazy SaccoSettingsService settingsService) {
        this.redis           = redis;
        this.settingsService = settingsService;
    }

    // ── Dynamic general limit ─────────────────────────────────────────────────

    private int generalLimit() {
        try {
            int v = settingsService.getRateLimitGeneralPerMin();
            return v > 0 ? v : DEFAULT_GENERAL_LIMIT;
        } catch (Exception e) {
            return DEFAULT_GENERAL_LIMIT;
        }
    }

    // ── Filter ────────────────────────────────────────────────────────────────

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Only rate-limit authenticated users
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            filterChain.doFilter(request, response);
            return;
        }

        String userIdentifier = auth.getName();
        String path           = request.getRequestURI();
        String method         = request.getMethod();

        // Bypass certain paths entirely
        for (String prefix : BYPASS_PREFIXES) {
            if (path.startsWith(prefix)) {
                filterChain.doFilter(request, response);
                return;
            }
        }

        // Reads-only — skip general rate limit for GETs
        if ("GET".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 1. Endpoint-specific limits (wins on first prefix match) ──────────
        for (Map.Entry<String, RateLimit> entry : ENDPOINT_LIMITS.entrySet()) {
            if (path.startsWith(entry.getKey())) {
                RateLimit limit = entry.getValue();
                String key = "rl:endpoint:" + userIdentifier + ":" + entry.getKey();
                if (isRateLimited(key, limit.maxRequests(), limit.window(), response)) return;
                filterChain.doFilter(request, response);
                return;
            }
        }

        // ── 2. General limit (reads setting dynamically) ──────────────────────
        String generalKey = "rl:general:" + userIdentifier;
        if (isRateLimited(generalKey, generalLimit(), GENERAL_WINDOW, response)) return;

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(String key, int maxRequests, Duration window,
                                  HttpServletResponse response) throws IOException {
        Long count = redis.opsForValue().increment(key);

        if (count == null) {
            log.warn("Redis unavailable for rate limit check on key: {}", key);
            return false; // Fail open — don't block users if Redis is down
        }

        if (count == 1) {
            redis.expire(key, window.toSeconds(), TimeUnit.SECONDS);
        }

        if (count > maxRequests) {
            Long ttl = redis.getExpire(key, TimeUnit.SECONDS);
            long retryAfter = ttl != null && ttl > 0 ? ttl : window.toSeconds();

            log.warn("Rate limit exceeded for key: {} (count: {}, limit: {})", key, count, maxRequests);

            response.setStatus(429);
            response.setContentType("application/json");
            response.setHeader("Retry-After",        String.valueOf(retryAfter));
            response.setHeader("X-RateLimit-Limit",  String.valueOf(maxRequests));
            response.setHeader("X-RateLimit-Remaining", "0");
            response.setHeader("X-RateLimit-Reset",  String.valueOf(System.currentTimeMillis() / 1000 + retryAfter));
            response.getWriter().write(
                    "{\"error\":\"RATE_LIMIT_EXCEEDED\"," +
                            "\"message\":\"Too many requests. Please try again in " + retryAfter + " seconds.\"," +
                            "\"retryAfter\":" + retryAfter + "}"
            );
            return true;
        }

        return false;
    }

    private record RateLimit(int maxRequests, Duration window) {}
}