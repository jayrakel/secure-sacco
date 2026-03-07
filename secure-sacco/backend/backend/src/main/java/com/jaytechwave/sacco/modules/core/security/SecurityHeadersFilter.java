package com.jaytechwave.sacco.modules.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String POWERED_BY_HEADER = "X-Powered-By";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 1. Generate Request ID (UUID)
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isEmpty()) {
            requestId = UUID.randomUUID().toString();
        }

        // Add Request ID to Response and MDC (Mapped Diagnostic Context) for logger tracing
        response.setHeader(REQUEST_ID_HEADER, requestId);
        MDC.put("requestId", requestId);

        // 2. Prevent Server Fingerprinting
        // TomCat rarely adds this by default in modern Spring Boot, but we overwrite it if a proxy does
        response.setHeader(POWERED_BY_HEADER, "");

        // 3. Absolute Cache Kill for API responses
        if (request.getRequestURI().startsWith("/api/")) {
            response.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
            response.setHeader("Pragma", "no-cache");
            response.setHeader("Expires", "0");
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Clean up MDC thread context to prevent memory leaks
            MDC.remove("requestId");
        }
    }
}