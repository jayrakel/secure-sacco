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
 * Protects Co-op Connect callback endpoints by only allowing requests from
 * Co-op Bank's registered IP addresses.
 *
 * <p>Guarded paths (anything under {@code /api/v1/payments/coop/}):</p>
 * <ul>
 *   <li>{@code /api/v1/payments/coop/stk-callback} — STK push result</li>
 *   <li>{@code /api/v1/payments/coop/ipn}           — B2B IPN from CBS</li>
 * </ul>
 *
 * <p>The allowlist is configurable via {@code sacco.coopconnect.allowed-callback-ips}.
 * Supports exact IPs and CIDR ranges. When empty (not yet provided by Co-op Bank),
 * the filter logs a warning and allows the request through — remove this bypass
 * once Co-op provides their IP ranges.</p>
 *
 * <p>Ensure Nginx forwards {@code X-Forwarded-For} and set
 * {@code server.forward-headers-strategy=framework} in prod so the real
 * client IP is resolved correctly.</p>
 */
@Slf4j
@Component
public class MpesaIpWhitelistFilter extends OncePerRequestFilter {

    private static final String COOP_CALLBACK_PATH_PREFIX = "/api/v1/payments/coop/";

    private final Set<String>    exactAllowedIps;
    private final List<CidrRange> allowedCidrRanges;
    private final boolean        bypassModeEnabled;

    public MpesaIpWhitelistFilter(
            @Value("${sacco.coopconnect.allowed-callback-ips:}") String allowedIpsConfig) {

        Set<String> exact = new java.util.HashSet<>();
        List<CidrRange> cidrs = new ArrayList<>();

        if (allowedIpsConfig != null && !allowedIpsConfig.isBlank()) {
            Arrays.stream(allowedIpsConfig.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .forEach(entry -> {
                        if (entry.contains("/")) {
                            try { cidrs.add(new CidrRange(entry)); }
                            catch (Exception e) {
                                log.warn("Skipping invalid CIDR '{}': {}", entry, e.getMessage());
                            }
                        } else {
                            exact.add(entry);
                        }
                    });
        }

        this.exactAllowedIps   = Set.copyOf(exact);
        this.allowedCidrRanges = List.copyOf(cidrs);
        this.bypassModeEnabled = exact.isEmpty() && cidrs.isEmpty();

        if (bypassModeEnabled) {
            log.warn("CoopConnectIpWhitelist: NO IPs configured — callbacks will be allowed from ANY IP. " +
                    "Set sacco.coopconnect.allowed-callback-ips once Co-op Bank provides their IP ranges.");
        } else {
            log.info("CoopConnectIpWhitelist: {} exact IP(s), {} CIDR range(s)",
                    exactAllowedIps.size(), allowedCidrRanges.size());
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (!path.startsWith(COOP_CALLBACK_PATH_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Bypass mode: no IPs configured yet — allow but warn
        if (bypassModeEnabled) {
            log.warn("Co-op callback allowed (BYPASS MODE — no IP whitelist set): {}", path);
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);

        if (isAllowed(clientIp)) {
            log.debug("Co-op callback allowed from IP: {}", clientIp);
            filterChain.doFilter(request, response);
            return;
        }

        log.warn("Co-op callback BLOCKED from unauthorized IP: {} (path: {})", clientIp, path);
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"FORBIDDEN\",\"message\":\"Access denied.\"}");
    }

    private boolean isAllowed(String clientIp) {
        if (exactAllowedIps.contains(clientIp)) return true;
        for (CidrRange r : allowedCidrRanges) {
            if (r.contains(clientIp)) return true;
        }
        return false;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String[] parts = xff.split(",");
            for (int i = parts.length - 1; i >= 0; i--) {
                String c = parts[i].trim();
                if (!c.isBlank()) return c;
            }
        }
        return request.getRemoteAddr();
    }

    // ── CIDR helper ───────────────────────────────────────────────────────────

    private static class CidrRange {
        private final int networkInt, maskInt;
        private final String cidr;

        CidrRange(String cidr) throws UnknownHostException {
            this.cidr = cidr;
            String[] p = cidr.split("/");
            int prefix = Integer.parseInt(p[1]);
            this.maskInt    = prefix == 0 ? 0 : (0xFFFFFFFF << (32 - prefix));
            this.networkInt = ipToInt(InetAddress.getByName(p[0]).getAddress()) & maskInt;
        }

        boolean contains(String ip) {
            try {
                InetAddress a = InetAddress.getByName(ip);
                if (a.getAddress().length != 4) return false;
                return (ipToInt(a.getAddress()) & maskInt) == networkInt;
            } catch (UnknownHostException e) { return false; }
        }

        private static int ipToInt(byte[] b) {
            return ((b[0] & 0xFF) << 24) | ((b[1] & 0xFF) << 16)
                    | ((b[2] & 0xFF) << 8)  |  (b[3] & 0xFF);
        }

        @Override public String toString() { return cidr; }
    }
}