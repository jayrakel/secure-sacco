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
import com.jaytechwave.sacco.modules.core.dto.MfaDTOs.*;
import com.jaytechwave.sacco.modules.core.service.MfaService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import dev.samstevens.totp.exceptions.QrGenerationException;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.UUID;
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
    private final MfaService mfaService;
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;

    public AuthController(AuthenticationManager authenticationManager,
                          LoginAttemptService loginAttemptService,
                          SecurityAuditService securityAuditService,
                          PasswordResetService passwordResetService,
                          MfaService mfaService,
                          CustomUserDetailsService customUserDetailsService,
                          UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.loginAttemptService = loginAttemptService;
        this.securityAuditService = securityAuditService;
        this.passwordResetService = passwordResetService;
        this.mfaService = mfaService;
        this.customUserDetailsService = customUserDetailsService;
        this.userRepository = userRepository;
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
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(identifier, loginRequest.getPassword())
            );

            loginAttemptService.loginSucceeded(identifier);
            loginAttemptService.loginSucceeded(clientIp);

            CustomUserDetailsService.CustomUserDetails userDetails = (CustomUserDetailsService.CustomUserDetails) authentication.getPrincipal();

            // --- INTERCEPT FOR MFA ---
            if (userDetails.isMfaEnabled()) {
                String mfaToken = mfaService.createPreAuthToken(userDetails.getId());
                securityAuditService.logEventWithActorAndIp(identifier, "MFA_CHALLENGE_ISSUED", "Account: " + identifier, clientIp, "Password valid, pending MFA");

                return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                        "status", "REQUIRES_MFA",
                        "mfaToken", mfaToken,
                        "message", "MFA is required. Please submit your authenticator code."
                ));
            }

            // Establish Session (Normal Flow)
            establishSession(request, authentication);

            return ResponseEntity.ok(buildLoginResponse(userDetails));

        } catch (AuthenticationException e) {
            // 4. Failure! Record the failed attempt for both IP and Account
            loginAttemptService.loginFailed(identifier);
            loginAttemptService.loginFailed(clientIp);

            securityAuditService.logEventWithActorAndIp(identifier, "LOGIN_FAILED", "Account: " + identifier, clientIp, "Invalid credentials");

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "Invalid credentials."));
        }
    }

    // --- HELPER METHODS FOR SESSION & RESPONSE ---
    private void establishSession(HttpServletRequest request, Authentication authentication) {
        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);
        request.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);
    }

    private Map<String, Object> buildLoginResponse(CustomUserDetailsService.CustomUserDetails userDetails) {
        // Fetch full user to check for Member relation
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", userDetails.getId());
        userMap.put("email", userDetails.getUsername());
        userMap.put("firstName", userDetails.getFirstName());
        userMap.put("lastName", userDetails.getLastName());
        userMap.put("permissions", userDetails.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList()));
        userMap.put("roles", userDetails.getRoles());
        userMap.put("mfaEnabled", userDetails.isMfaEnabled());

        // Attach Member details if this user is a Member
        if (user.getMember() != null) {
            userMap.put("memberNumber", user.getMember().getMemberNumber());
            userMap.put("memberStatus", user.getMember().getStatus().name());
        }

        return Map.of(
                "message", "Login successful",
                "user", userMap
        );
    }

    // --- NEW MFA ENDPOINTS ---

    @PostMapping("/login/mfa")
    public ResponseEntity<?> loginMfa(@Valid @RequestBody MfaLoginRequest mfaRequest, HttpServletRequest httpRequest) {
        try {
            UUID userId = mfaService.verifyPreAuthToken(mfaRequest.getMfaToken());
            User user = userRepository.findById(userId).orElseThrow();

            if (!mfaService.verifyCode(user.getMfaSecret(), mfaRequest.getCode())) {
                securityAuditService.logEventWithActorAndIp(user.getEmail(), "MFA_FAILED", "Account: " + user.getEmail(), getClientIP(httpRequest), "Invalid TOTP Code");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized", "message", "Invalid MFA code."));
            }

            // Manually build Authentication object since they passed MFA
            UserDetails userDetails = customUserDetailsService.loadUserByUsername(user.getEmail());
            Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

            establishSession(httpRequest, authentication);
            mfaService.clearPreAuthToken(mfaRequest.getMfaToken());

            securityAuditService.logEventWithActorAndIp(user.getEmail(), "LOGIN_SUCCESS", "Account: " + user.getEmail(), getClientIP(httpRequest), "MFA login successful");

            return ResponseEntity.ok(buildLoginResponse((CustomUserDetailsService.CustomUserDetails) userDetails));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized", "message", "Token expired or invalid."));
        }
    }

    @GetMapping("/mfa/setup")
    public ResponseEntity<?> generateMfaQrCode(Authentication authentication) throws QrGenerationException {
        CustomUserDetailsService.CustomUserDetails userDetails = (CustomUserDetailsService.CustomUserDetails) authentication.getPrincipal();
        Map<String, String> mfaData = mfaService.generateMfaSetup(userDetails.getId());
        return ResponseEntity.ok(mfaData);
    }

    @PostMapping("/mfa/enable")
    public ResponseEntity<?> enableMfa(@Valid @RequestBody VerifyMfaRequest request, Authentication authentication, HttpServletRequest httpRequest) {
        try {
            CustomUserDetailsService.CustomUserDetails userDetails = (CustomUserDetailsService.CustomUserDetails) authentication.getPrincipal();
            mfaService.enableMfa(userDetails.getId(), request.getCode());

            refreshSessionAuthentication(userDetails.getUsername(), httpRequest);

            securityAuditService.logEventWithActorAndIp(userDetails.getUsername(), "MFA_ENABLED", "Account: " + userDetails.getUsername(), getClientIP(httpRequest), "User successfully turned on MFA");

            return ResponseEntity.ok(Map.of("message", "MFA successfully enabled."));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", e.getMessage()));
        }
    }

    @PostMapping("/mfa/disable")
    public ResponseEntity<?> disableMfa(Authentication authentication, HttpServletRequest httpRequest) {
        CustomUserDetailsService.CustomUserDetails userDetails = (CustomUserDetailsService.CustomUserDetails) authentication.getPrincipal();
        mfaService.disableMfa(userDetails.getId());

        refreshSessionAuthentication(userDetails.getUsername(), httpRequest);

        securityAuditService.logEventWithActorAndIp(userDetails.getUsername(), "MFA_DISABLED", "Account: " + userDetails.getUsername(), getClientIP(httpRequest), "User intentionally disabled MFA");

        return ResponseEntity.ok(Map.of("message", "MFA successfully disabled."));
    }

    private void refreshSessionAuthentication(String username, HttpServletRequest request) {
        UserDetails updatedUserDetails = customUserDetailsService.loadUserByUsername(username);
        Authentication newAuth = new UsernamePasswordAuthenticationToken(updatedUserDetails, null, updatedUserDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(newAuth);
        request.getSession().setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, SecurityContextHolder.getContext());
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
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

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
        responseBody.put("mfaEnabled", userDetails.isMfaEnabled());

        if (user.getMember() != null) {
            responseBody.put("memberNumber", user.getMember().getMemberNumber());
            responseBody.put("memberStatus", user.getMember().getStatus().name());
        }

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