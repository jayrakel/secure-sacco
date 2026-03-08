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
 * Forces users with {@code must_change_password = true} to change their
 * password before accessing any other endpoint.
 *
 * <p>Returns HTTP 403 with a JSON error body for all API calls except the
 * password-change endpoint itself, so the frontend can redirect to the
 * change-password screen.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MustChangePasswordFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    /**
     * Paths that are always allowed even when must_change_password is true.
     */
    private static final Set<String> ALLOWED_PATHS = Set.of(
            "/api/v1/auth/change-password",
            "/api/v1/auth/logout",
            "/api/v1/auth/csrf",
            "/actuator/health"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Pass through always-allowed paths
        if (ALLOWED_PATHS.stream().anyMatch(path::startsWith)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            filterChain.doFilter(request, response);
            return;
        }

        String email = auth.getName();

        // Use a single lightweight query — don't load the full user object for every request
        boolean mustChange = userRepository.existsByEmailAndMustChangePasswordTrue(email);

        if (mustChange) {
            log.warn("User {} attempted to access {} but must change password first.", email, path);
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"PASSWORD_CHANGE_REQUIRED\"," +
                            "\"message\":\"You must change your password before continuing.\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }
}