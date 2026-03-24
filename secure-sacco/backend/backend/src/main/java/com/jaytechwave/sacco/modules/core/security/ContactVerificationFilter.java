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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Blocks any authenticated user whose email or phone has not yet been verified.
 *
 * <pre>HTTP 403 { "error": "CONTACT_VERIFICATION_REQUIRED", "message": "..." }</pre>
 *
 * <p>Runs <em>after</em> {@link MustChangePasswordFilter} in the security chain,
 * so the password has already been changed before this gate is reached.
 *
 * <p>Applies to ALL authenticated staff (SYSTEM_ADMIN and officer roles alike).
 * Staff created via POST /api/v1/users are created with emailVerified=false and
 * phoneVerified=false, so they hit this gate immediately after their first
 * password change.
 *
 * <p>The frontend intercepts this 403 in {@code api-client.ts} and redirects
 * the user to the contact verification step.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ContactVerificationFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    /**
     * Paths that are always allowed even when contacts are not verified.
     * Kept intentionally permissive so the wizard and auth flows can function.
     */
    private static final Set<String> ALLOWED_PREFIXES = Set.of(
            "/api/v1/auth/me",
            "/api/v1/auth/login",
            "/api/v1/auth/logout",
            "/api/v1/auth/csrf",
            "/api/v1/auth/change-password",
            "/api/v1/auth/verify/",       // send/confirm email + phone verification
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

        // Lightweight per-request check using a single DB projection.
        // Applies to ALL authenticated users — not just SYSTEM_ADMIN.
        // Officers created via UserService.createUser() start with both flags false
        // and must verify before gaining access.
        User user = userRepository.findByEmail(auth.getName()).orElse(null);
        if (user == null) {
            chain.doFilter(request, response);
            return;
        }

        if (!user.isEmailVerified() || !user.isPhoneVerified()) {
            log.warn("User {} accessed {} before contact verification (emailVerified={}, phoneVerified={}).",
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