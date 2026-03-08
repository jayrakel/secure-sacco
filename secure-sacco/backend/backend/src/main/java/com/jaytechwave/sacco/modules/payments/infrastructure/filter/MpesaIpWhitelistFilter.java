package com.jaytechwave.sacco.modules.payments.infrastructure.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Protects M-Pesa callback endpoints by only allowing requests from
 * Safaricom's known IP ranges.
 *
 * <p>All other IPs are rejected with HTTP 403 before any business logic runs.</p>
 *
 * <p>The allowlist is configurable via the
 * {@code sacco.safaricom.daraja.allowed-callback-ips} property so that Safaricom
 * IP updates can be made via environment variable without redeploying.</p>
 *
 * <p><strong>Note:</strong> When deployed behind a reverse proxy (Nginx, Caddy,
 * or a cloud load balancer), ensure the proxy is configured to forward
 * {@code X-Forwarded-For} and set {@code server.forward-headers-strategy=framework}
 * in {@code application-prod.yml} so that {@code request.getRemoteAddr()} returns
 * the real client IP rather than the proxy IP.</p>
 */
@Slf4j
@Component
public class MpesaIpWhitelistFilter extends OncePerRequestFilter {

    private static final String MPESA_CALLBACK_PATH_PREFIX = "/api/v1/payments/mpesa/";

    private final Set<String> allowedIps;

    public MpesaIpWhitelistFilter(
            @Value("${sacco.safaricom.daraja.allowed-callback-ips:" +
                    "196.201.214.200,196.201.214.206,196.201.213.114," +
                    "196.201.214.207,196.201.214.208,196.201.214.209}")
            String allowedIpsConfig) {

        this.allowedIps = Arrays.stream(allowedIpsConfig.split(","))
                .map(String::trim)
                .filter(ip -> !ip.isBlank())
                .collect(Collectors.toUnmodifiableSet());

        log.info("MpesaIpWhitelistFilter initialized with {} allowed IP(s): {}",
                allowedIps.size(), allowedIps);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (!path.startsWith(MPESA_CALLBACK_PATH_PREFIX)) {
            // Not a callback endpoint — pass through
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);

        if (allowedIps.contains(clientIp)) {
            log.debug("M-Pesa callback allowed from IP: {}", clientIp);
            filterChain.doFilter(request, response);
            return;
        }

        log.warn("M-Pesa callback BLOCKED from unauthorized IP: {} (path: {})", clientIp, path);

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"error\":\"FORBIDDEN\",\"message\":\"Access denied.\"}"
        );
    }

    /**
     * Resolves the real client IP, X-Forwarded-For aware.
     *
     * <p>Uses the <em>rightmost</em> trusted IP from X-Forwarded-For to defend
     * against IP spoofing — each proxy appends its own IP, so the rightmost
     * value is the last trusted hop.</p>
     */
    private String resolveClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");

        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            // X-Forwarded-For: client, proxy1, proxy2
            // We take the rightmost non-blank segment (closest trusted proxy)
            String[] parts = xForwardedFor.split(",");
            for (int i = parts.length - 1; i >= 0; i--) {
                String candidate = parts[i].trim();
                if (!candidate.isBlank()) {
                    return candidate;
                }
            }
        }

        return request.getRemoteAddr();
    }
}