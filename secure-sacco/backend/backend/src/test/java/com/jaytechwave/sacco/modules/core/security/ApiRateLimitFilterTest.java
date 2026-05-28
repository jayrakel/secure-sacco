package com.jaytechwave.sacco.modules.core.security;

import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApiRateLimitFilter")
class ApiRateLimitFilterTest {

    @Mock StringRedisTemplate redis;
    @Mock ValueOperations<String, String> valueOps;
    @Mock SaccoSettingsService settingsService;

    private ApiRateLimitFilter filter;

    @BeforeEach
    void setUp() {
        lenient().when(redis.opsForValue()).thenReturn(valueOps);
        lenient().when(settingsService.getRateLimitGeneralPerMin()).thenReturn(60);
        filter = new ApiRateLimitFilter(redis, settingsService);

        // Authenticate user in security context
        var auth = new UsernamePasswordAuthenticationToken(
                "user@sacco.com", null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ─── General rate limit ───────────────────────────────────────────

    @Test
    @DisplayName("allows request when under general limit")
    void allowsRequestUnderGeneralLimit() throws Exception {
        when(valueOps.increment(anyString())).thenReturn(1L);
        when(redis.expire(anyString(), anyLong(), any(TimeUnit.class))).thenReturn(true);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/members");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("blocks request when general limit is exceeded — returns 429")
    void blocksRequestOverGeneralLimit() throws Exception {
        when(valueOps.increment(anyString())).thenReturn(61L); // over 60/min
        when(redis.getExpire(anyString(), any(TimeUnit.class))).thenReturn(30L);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/members");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("30");
        assertThat(chain.getRequest()).isNull();
    }

    // ─── STK endpoint stricter limit ─────────────────────────────────

    @Test
    @DisplayName("STK push endpoint allows first 5 calls per hour")
    void stkAllowsFirstFiveCallsPerHour() throws Exception {
        when(valueOps.increment(anyString())).thenReturn(5L);
        // expire is only called on first increment (count == 1), use lenient for this test
        lenient().when(redis.expire(anyString(), anyLong(), any(TimeUnit.class))).thenReturn(true);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/payments/mpesa/stk");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("STK push endpoint blocks 6th call in same hour — returns 429")
    void stkBlocksSixthCallPerHour() throws Exception {
        when(valueOps.increment(anyString())).thenReturn(6L);
        when(redis.getExpire(anyString(), any(TimeUnit.class))).thenReturn(3540L);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/payments/mpesa/stk");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(chain.getRequest()).isNull();
    }

    // ─── GET requests — not rate limited ─────────────────────────────

    @Test
    @DisplayName("GET requests are never rate limited")
    void getRequestsNotRateLimited() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/savings/balance");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
        verify(valueOps, never()).increment(anyString());
    }

    // ─── Unauthenticated requests — pass through ─────────────────────

    @Test
    @DisplayName("unauthenticated requests pass through without rate check")
    void unauthenticatedPassesThrough() throws Exception {
        SecurityContextHolder.clearContext(); // clear the test auth

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(valueOps, never()).increment(anyString());
    }

    // ─── Redis unavailable — fail open ───────────────────────────────

    @Test
    @DisplayName("fails open when Redis is unavailable — request is allowed through")
    void failsOpenWhenRedisUnavailable() throws Exception {
        when(valueOps.increment(anyString())).thenReturn(null);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/members");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }
}