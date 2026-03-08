package com.jaytechwave.sacco.modules.payments.infrastructure.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MpesaIpWhitelistFilter")
class MpesaIpWhitelistFilterTest {

    private static final String ALLOWED_IPS =
            "196.201.214.200,196.201.214.206,196.201.213.114";

    private MpesaIpWhitelistFilter filter;

    @BeforeEach
    void setUp() {
        filter = new MpesaIpWhitelistFilter(ALLOWED_IPS);
    }

    // ─── Allowed IPs ──────────────────────────────────────────────────

    @Test
    @DisplayName("allows request from a whitelisted Safaricom IP")
    void allowsWhitelistedIp() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/payments/mpesa/stk-callback");
        request.setRemoteAddr("196.201.214.200");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
        assertThat(chain.getRequest()).isNotNull(); // filter chain was called
    }

    @Test
    @DisplayName("allows all whitelisted IPs")
    void allowsAllWhitelistedIps() throws Exception {
        for (String ip : ALLOWED_IPS.split(",")) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setRequestURI("/api/v1/payments/mpesa/c2b-confirm");
            request.setRemoteAddr(ip.trim());

            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilterInternal(request, response, chain);

            assertThat(response.getStatus())
                    .as("IP %s should be allowed", ip)
                    .isEqualTo(HttpServletResponse.SC_OK);
        }
    }

    // ─── Blocked IPs ──────────────────────────────────────────────────

    @Test
    @DisplayName("blocks callback request from unauthorized IP — returns 403")
    void blocksUnauthorizedIp() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/payments/mpesa/stk-callback");
        request.setRemoteAddr("8.8.8.8");  // Google DNS — not Safaricom

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_FORBIDDEN);
        assertThat(chain.getRequest()).isNull(); // chain was NOT called
    }

    // ─── Non-callback paths — filter should not apply ─────────────────

    @Test
    @DisplayName("passes non-callback paths through without IP check")
    void passesNonCallbackPaths() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/loans/applications");
        request.setRemoteAddr("1.2.3.4");  // arbitrary IP

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
        assertThat(chain.getRequest()).isNotNull(); // chain was called
    }

    // ─── X-Forwarded-For (reverse proxy scenarios) ────────────────────

    @Test
    @DisplayName("resolves real IP from X-Forwarded-For header (rightmost)")
    void resolvesRealIpFromXForwardedFor() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/payments/mpesa/stk-callback");
        request.setRemoteAddr("10.0.0.1");  // internal proxy IP
        // Real client is the rightmost entry
        request.addHeader("X-Forwarded-For", "203.0.113.99, 196.201.214.200");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        // Rightmost X-Forwarded-For = 196.201.214.200 (Safaricom) → allowed
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("blocks spoofed X-Forwarded-For when rightmost IP is not whitelisted")
    void blocksSpoofedXForwardedFor() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/payments/mpesa/stk-callback");
        request.setRemoteAddr("8.8.8.8");  // real proxy IP — not Safaricom
        // Attacker tries to spoof Safaricom IP in leftmost X-Forwarded-For entry
        request.addHeader("X-Forwarded-For", "196.201.214.200, 8.8.8.8");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        // Rightmost = 8.8.8.8 → blocked
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_FORBIDDEN);
        assertThat(chain.getRequest()).isNull();
    }
}