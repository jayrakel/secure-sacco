package com.jaytechwave.sacco.modules.core.security;

import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Intercepts requests from the SYSTEM_ADMIN (and staff officers) whose
 * email or phone has not yet been verified, and returns:
 *
 * <pre>HTTP 403 { "error": "CONTACT_VERIFICATION_REQUIRED", "message": "..." }</pre>
 *
 * <p>This filter runs <em>after</em> {@link MustChangePasswordFilter} in the
 * security chain, so by the time this filter fires the password has already
 * been changed.
 *
 * <p>The frontend intercepts this 403 in {@code api-client.ts} and redirects
 * the user to {@code /verify-contact}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ContactVerificationFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    /**
     * Paths that are always allowed even when contacts are not verified.
     * Kept intentionally permissive so the wizard can function.
     */
    private static final Set<String> ALLOWED_PREFIXES = Set.of(
            "/api/v1/auth/me",
            "/api/v1/auth/login",
            "/api/v1/auth/logout",
            "/api/v1/auth/csrf",
            "/api/v1/auth/change-password",
            "/api/v1/auth/verify/",       // send/confirm OTP endpoints
            "/api/v1/setup/",             // setup status endpoint
            "/api/v1/settings/sacco",     // admin needs to save platform config
            "/api/v1/users",              // admin needs to create officer users
            "/api/v1/roles",              // admin needs to fetch role list
            "/actuator/health"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (ALLOWED_PREFIXES.stream().anyMatch(path::startsWith)) {
            chain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            chain.doFilter(request, response);
            return;
        }

        // Only enforce for SYSTEM_ADMIN — officers go through the activation flow
        boolean isAdmin = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_SYSTEM_ADMIN"::equals);

        if (!isAdmin) {
            chain.doFilter(request, response);
            return;
        }

        // Lightweight per-request check using a single DB projection
        User user = userRepository.findByEmail(auth.getName()).orElse(null);
        if (user == null) {
            chain.doFilter(request, response);
            return;
        }

        if (!user.isEmailVerified() || !user.isPhoneVerified()) {
            log.warn("SYSTEM_ADMIN {} accessed {} before contact verification (email={}, phone={}).",
                    auth.getName(), path, user.isEmailVerified(), user.isPhoneVerified());
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"CONTACT_VERIFICATION_REQUIRED\"," +
                            "\"message\":\"You must verify your email and phone number before continuing.\"}"
            );
            return;
        }

        chain.doFilter(request, response);
    }
}