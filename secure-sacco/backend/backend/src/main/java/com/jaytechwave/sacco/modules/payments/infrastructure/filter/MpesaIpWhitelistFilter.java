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
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Protects M-Pesa callback endpoints by only allowing requests from
 * Safaricom's known IP ranges.
 *
 * <p>All other IPs are rejected with HTTP 403 before any business logic runs.</p>
 *
 * <p>The allowlist is configurable via the
 * {@code sacco.safaricom.daraja.allowed-callback-ips} property and supports
 * both exact IPs (e.g. {@code 196.201.214.200}) and CIDR ranges
 * (e.g. {@code 196.201.212.0/23}) so that Safaricom IP updates can be made
 * via environment variable without redeploying.</p>
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

    /**
     * Full set of Safaricom Daraja/M-Pesa callback IP ranges (as of 2025).
     * Covers both the 196.201.212.x/213.x and 196.201.214.x blocks.
     * Source: https://developer.safaricom.co.ke/docs#ip-address-whitelisting
     */
    private static final String SAFARICOM_DEFAULT_IPS =
            // Exact IPs from Safaricom developer portal
            "196.201.214.200," +
            "196.201.214.206," +
            "196.201.214.207," +
            "196.201.214.208," +
            "196.201.214.209," +
            "196.201.213.114," +
            // CIDR blocks covering the full Safaricom AS37061 callback range
            "196.201.212.0/23," +   // covers 196.201.212.x and 196.201.213.x
            "196.201.214.0/24";     // covers 196.201.214.x

    private final Set<String> exactAllowedIps;
    private final List<CidrRange> allowedCidrRanges;

    public MpesaIpWhitelistFilter(
            @Value("${sacco.safaricom.daraja.allowed-callback-ips:" + SAFARICOM_DEFAULT_IPS + "}")
            String allowedIpsConfig) {

        Set<String> exact = new java.util.HashSet<>();
        List<CidrRange> cidrs = new ArrayList<>();

        Arrays.stream(allowedIpsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .forEach(entry -> {
                    if (entry.contains("/")) {
                        try {
                            cidrs.add(new CidrRange(entry));
                        } catch (Exception e) {
                            log.warn("Skipping invalid CIDR entry '{}': {}", entry, e.getMessage());
                        }
                    } else {
                        exact.add(entry);
                    }
                });

        this.exactAllowedIps = Set.copyOf(exact);
        this.allowedCidrRanges = List.copyOf(cidrs);

        log.info("MpesaIpWhitelistFilter initialized — {} exact IP(s), {} CIDR range(s)",
                exactAllowedIps.size(), allowedCidrRanges.size());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (!path.startsWith(MPESA_CALLBACK_PATH_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);

        if (isAllowed(clientIp)) {
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

    private boolean isAllowed(String clientIp) {
        if (exactAllowedIps.contains(clientIp)) {
            return true;
        }
        for (CidrRange range : allowedCidrRanges) {
            if (range.contains(clientIp)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Resolves the real client IP, X-Forwarded-For aware.
     *
     * <p>Uses the <em>rightmost</em> non-blank segment of X-Forwarded-For to defend
     * against IP spoofing — each proxy appends its own IP, so the rightmost
     * value is the last trusted hop.</p>
     */
    private String resolveClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");

        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
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

    // ── CIDR helper ──────────────────────────────────────────────────────────

    /**
     * Lightweight CIDR range checker — no external dependencies required.
     * Supports IPv4 only (all Safaricom IPs are IPv4).
     */
    private static class CidrRange {

        private final int networkInt;
        private final int maskInt;
        private final String cidr;

        CidrRange(String cidr) throws UnknownHostException {
            this.cidr = cidr;
            String[] parts = cidr.split("/");
            int prefix = Integer.parseInt(parts[1]);
            this.maskInt = prefix == 0 ? 0 : (0xFFFFFFFF << (32 - prefix));
            this.networkInt = ipToInt(InetAddress.getByName(parts[0]).getAddress()) & maskInt;
        }

        boolean contains(String ip) {
            try {
                InetAddress addr = InetAddress.getByName(ip);
                if (addr.getAddress().length != 4) return false; // skip IPv6
                int ipInt = ipToInt(addr.getAddress());
                return (ipInt & maskInt) == networkInt;
            } catch (UnknownHostException e) {
                return false;
            }
        }

        private static int ipToInt(byte[] bytes) {
            return ((bytes[0] & 0xFF) << 24)
                 | ((bytes[1] & 0xFF) << 16)
                 | ((bytes[2] & 0xFF) << 8)
                 |  (bytes[3] & 0xFF);
        }

        @Override
        public String toString() { return cidr; }
    }
}