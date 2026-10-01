package com.jaytechwave.sacco.modules.core.security;

import com.jaytechwave.sacco.modules.core.service.MfaService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final MfaService mfaService;
    private final CustomUserDetailsService customUserDetailsService;

    @Value("${sacco.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");

        log.info("OAuth2 login attempt for email: {}", email);

        if (email == null) {
            log.error("Google didn't provide an email");
            getRedirectStrategy().sendRedirect(request, response, frontendUrl + "/login?error=no_email");
            return;
        }

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            log.warn("User not found for Google login: {}", email);
            getRedirectStrategy().sendRedirect(request, response, frontendUrl + "/login?error=account_not_found");
            return;
        }

        boolean isStaffOrAdmin = user.getRoles().stream()
            .anyMatch(role -> role.getName().equals("SYSTEM_ADMIN") || role.getName().equals("STAFF"));

        if (isStaffOrAdmin) {
            log.warn("Staff/Admin attempted Google login. Rejected for security: {}", email);
            getRedirectStrategy().sendRedirect(request, response, frontendUrl + "/login?error=staff_google_login_disabled");
            return;
        }

        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            userRepository.save(user);
        }

        CustomUserDetailsService.CustomUserDetails userDetails = (CustomUserDetailsService.CustomUserDetails) customUserDetailsService.loadUserByUsername(user.getEmail());

        if (userDetails.isMfaEnabled()) {
            mfaService.dispatchMfaCode(user); // Send MFA code if SMS/Email
            String mfaToken = mfaService.createPreAuthToken(userDetails.getId());
            log.info("MFA required for user: {}. Redirecting with pre-auth token.", user.getEmail());
            getRedirectStrategy().sendRedirect(request, response, frontendUrl + "/login?mfaToken=" + mfaToken);
            return;
        }

        // Establish session
        Authentication finalAuth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(finalAuth);
        SecurityContextHolder.setContext(securityContext);

        HttpSession session = request.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);
        session.setAttribute("clientIp", getClientIP(request));
        session.setAttribute("userAgent", request.getHeader("User-Agent"));

        log.info("Google login successful for user: {}", user.getEmail());
        
        getRedirectStrategy().sendRedirect(request, response, frontendUrl + "/dashboard");
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
