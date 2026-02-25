package com.jaytechwave.sacco.modules.core.controller;

import com.jaytechwave.sacco.modules.core.dto.LoginRequest;
import com.jaytechwave.sacco.modules.core.security.CustomUserDetailsService;
import com.jaytechwave.sacco.modules.core.service.LoginAttemptService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.core.dto.ForgotPasswordRequest;
import com.jaytechwave.sacco.modules.core.dto.ResetPasswordRequest;
import com.jaytechwave.sacco.modules.core.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final LoginAttemptService loginAttemptService;
    private final SecurityAuditService securityAuditService;
    private final PasswordResetService passwordResetService;

    // --- FIX 1: Added SecurityAuditService to the constructor parameters ---
    public AuthController(AuthenticationManager authenticationManager,
                          LoginAttemptService loginAttemptService,
                          PasswordResetService passwordResetService,
                          SecurityAuditService securityAuditService) {
        this.authenticationManager = authenticationManager;
        this.loginAttemptService = loginAttemptService;
        this.securityAuditService = securityAuditService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response) {
        String identifier = loginRequest.getIdentifier();
        String clientIp = getClientIP(request);

        // 1. Check if the IP or the Account is locked out
        if (loginAttemptService.isBlocked(identifier) || loginAttemptService.isBlocked(clientIp)) {

            // Log that a locked user tried to get in
            securityAuditService.logEventWithActorAndIp(identifier, "LOGIN_BLOCKED", "Account: " + identifier, clientIp, "Attempted to log in while locked out");

            long remainingSeconds = Math.max(
                    loginAttemptService.getRemainingLockoutTimeSeconds(identifier),
                    loginAttemptService.getRemainingLockoutTimeSeconds(clientIp)
            );
            long minutes = (remainingSeconds / 60) + 1;

            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                            "error", "Too Many Requests",
                            "message", "Account or IP is locked due to multiple failed login attempts. Please try again in " + minutes + " minute(s)."
                    ));
        }

        try {
            // 2. Attempt Authentication
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(identifier, loginRequest.getPassword())
            );

            // 3. Success! Clear failure counters for both IP and Account
            loginAttemptService.loginSucceeded(identifier);
            loginAttemptService.loginSucceeded(clientIp);

            // Establish Session
            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(authentication);
            SecurityContextHolder.setContext(securityContext);
            request.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);

            // Build Response
            CustomUserDetailsService.CustomUserDetails userDetails = (CustomUserDetailsService.CustomUserDetails) authentication.getPrincipal();
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("message", "Login successful");
            responseBody.put("user", Map.of(
                    "id", userDetails.getId(),
                    "email", userDetails.getUsername(),
                    "firstName", userDetails.getFirstName(),
                    "lastName", userDetails.getLastName(),
                    "permissions", userDetails.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList()),
                    "roles", userDetails.getRoles()
            ));

            return ResponseEntity.ok(responseBody);

        } catch (AuthenticationException e) {
            // 4. Failure! Record the failed attempt for both IP and Account
            loginAttemptService.loginFailed(identifier);
            loginAttemptService.loginFailed(clientIp);

            // --- FIX 2: Moved the LOGIN_FAILED audit log here ---
            securityAuditService.logEventWithActorAndIp(identifier, "LOGIN_FAILED", "Account: " + identifier, clientIp, "Invalid credentials");

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "Invalid credentials."));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        request.getSession().invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "Not authenticated"));
        }

        CustomUserDetailsService.CustomUserDetails userDetails = (CustomUserDetailsService.CustomUserDetails) authentication.getPrincipal();

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("id", userDetails.getId());
        responseBody.put("email", userDetails.getUsername());
        responseBody.put("firstName", userDetails.getFirstName());
        responseBody.put("lastName", userDetails.getLastName());

        List<String> permissions = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
        responseBody.put("permissions", permissions);
        responseBody.put("roles", userDetails.getRoles());

        return ResponseEntity.ok(responseBody);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest httpRequest) {
        passwordResetService.generatePasswordResetToken(request.getEmail());

        securityAuditService.logEventWithActorAndIp(request.getEmail(), "PASSWORD_RESET_REQUESTED", "Account: " + request.getEmail(), getClientIP(httpRequest), "User requested a password reset link");

        // Always return a generic success message to prevent user enumeration
        return ResponseEntity.ok(Map.of("message", "If an account with that email exists, a password reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request, HttpServletRequest httpRequest) {
        try {
            passwordResetService.resetPassword(request.getToken(), request.getNewPassword());

            securityAuditService.logEventWithActorAndIp("SYSTEM", "PASSWORD_RESET_COMPLETED", "Token Used", getClientIP(httpRequest), "Password successfully reset via token");

            return ResponseEntity.ok(Map.of("message", "Password has been successfully reset. You may now log in."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", e.getMessage()));
        }
    }

    /**
     * Helper to extract the real IP address, even if the request passes through a proxy or load balancer.
     */
    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}