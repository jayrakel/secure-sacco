package com.jaytechwave.sacco.modules.payments.infrastructure.filter;

import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("MpesaIpWhitelistFilter — Co-op Connect callback IP protection")
class MpesaIpWhitelistFilterTest {

    /** Pretend Co-op Bank IP list — same format as COOP_ALLOWED_CALLBACK_IPS */
    private static final String ALLOWED_IPS =
            "196.201.214.200,196.201.214.206,196.201.213.114";

    /** Filter in normal mode — IP whitelist configured */
    private MpesaIpWhitelistFilter filterWithIps() {
        return new MpesaIpWhitelistFilter(ALLOWED_IPS);
    }

    /** Filter in bypass mode — no IPs configured (empty string) */
    private MpesaIpWhitelistFilter filterBypass() {
        return new MpesaIpWhitelistFilter("");
    }

    // ─── Allowed IPs ──────────────────────────────────────────────────

    @Test
    @DisplayName("allows request from a whitelisted Co-op IP on STK callback path")
    void allowsWhitelistedIp() throws Exception {
        MockHttpServletRequest  request  = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();

        request.setRequestURI("/api/v1/payments/coop/stk-callback");
        request.setRemoteAddr("196.201.214.200");

        filterWithIps().doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
        assertThat(chain.getRequest()).isNotNull(); // chain was called
    }

    @Test
    @DisplayName("allows request from a whitelisted Co-op IP on IPN path")
    void allowsWhitelistedIpOnIpnPath() throws Exception {
        MockHttpServletRequest  request  = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();

        request.setRequestURI("/api/v1/payments/coop/ipn");
        request.setRemoteAddr("196.201.213.114");

        filterWithIps().doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("allows all whitelisted IPs")
    void allowsAllWhitelistedIps() throws Exception {
        for (String ip : ALLOWED_IPS.split(",")) {
            MockHttpServletRequest  request  = new MockHttpServletRequest();
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain         chain    = new MockFilterChain();

            request.setRequestURI("/api/v1/payments/coop/stk-callback");
            request.setRemoteAddr(ip.trim());

            filterWithIps().doFilterInternal(request, response, chain);

            assertThat(response.getStatus())
                    .as("IP %s should be allowed", ip)
                    .isEqualTo(HttpServletResponse.SC_OK);
        }
    }

    // ─── Blocked IPs ──────────────────────────────────────────────────

    @Test
    @DisplayName("blocks callback request from unauthorized IP — returns 403")
    void blocksUnauthorizedIp() throws Exception {
        MockHttpServletRequest  request  = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();

        request.setRequestURI("/api/v1/payments/coop/stk-callback");
        request.setRemoteAddr("8.8.8.8"); // not a Co-op IP

        filterWithIps().doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_FORBIDDEN);
        assertThat(chain.getRequest()).isNull(); // chain was NOT called
    }

    // ─── Bypass mode (no IPs configured) ─────────────────────────────

    @Test
    @DisplayName("bypass mode: allows any IP when no whitelist is configured")
    void bypassModeAllowsAnyIp() throws Exception {
        MockHttpServletRequest  request  = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();

        request.setRequestURI("/api/v1/payments/coop/stk-callback");
        request.setRemoteAddr("1.2.3.4");

        filterBypass().doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
        assertThat(chain.getRequest()).isNotNull();
    }

    // ─── Non-callback paths — filter should not apply ─────────────────

    @Test
    @DisplayName("passes non-callback paths through without IP check")
    void passesNonCallbackPaths() throws Exception {
        MockHttpServletRequest  request  = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();

        request.setRequestURI("/api/v1/loans/applications");
        request.setRemoteAddr("1.2.3.4"); // arbitrary IP

        filterWithIps().doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
        assertThat(chain.getRequest()).isNotNull();
    }

    // ─── X-Forwarded-For (reverse proxy scenarios) ────────────────────

    @Test
    @DisplayName("resolves real IP from X-Forwarded-For header (rightmost)")
    void resolvesRealIpFromXForwardedFor() throws Exception {
        MockHttpServletRequest  request  = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();

        request.setRequestURI("/api/v1/payments/coop/stk-callback");
        request.setRemoteAddr("10.0.0.1"); // internal proxy
        request.addHeader("X-Forwarded-For", "203.0.113.99, 196.201.214.200");

        filterWithIps().doFilterInternal(request, response, chain);

        // Rightmost = 196.201.214.200 (Co-op) → allowed
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("blocks spoofed X-Forwarded-For when rightmost IP is not whitelisted")
    void blocksSpoofedXForwardedFor() throws Exception {
        MockHttpServletRequest  request  = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();

        request.setRequestURI("/api/v1/payments/coop/stk-callback");
        request.setRemoteAddr("8.8.8.8"); // real proxy — not Co-op
        // Attacker tries to spoof Co-op IP as leftmost entry
        request.addHeader("X-Forwarded-For", "196.201.214.200, 8.8.8.8");

        filterWithIps().doFilterInternal(request, response, chain);

        // Rightmost = 8.8.8.8 → blocked
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_FORBIDDEN);
        assertThat(chain.getRequest()).isNull();
    }
}