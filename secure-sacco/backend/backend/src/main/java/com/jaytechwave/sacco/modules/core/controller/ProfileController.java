package com.jaytechwave.sacco.modules.core.controller;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.core.security.CustomUserDetailsService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.users.domain.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Endpoints that let any authenticated user manage their own profile.
 *
 * <p>No special permission is required — only authentication.
 * Users can only modify their own account; admin-level changes
 * (roles, status, email change) go through UserController.</p>
 */
@RestController
@RequestMapping("/api/v1/auth/profile")
@RequiredArgsConstructor
@Tag(name = "Profile", description = "Self-service profile management for authenticated users")
public class ProfileController {

    private final UserRepository      userRepository;
    private final UserService         userService;
    private final SecurityAuditService auditService;

    // ── DTOs ─────────────────────────────────────────────────────────────────

    public record UpdateProfileRequest(
            @NotBlank(message = "First name is required") String firstName,
            @NotBlank(message = "Last name is required")  String lastName,
            String phoneNumber      // optional; null = keep existing
    ) {}

    // ── GET /auth/profile ─────────────────────────────────────────────────────

    @Operation(summary = "Get own profile", description = "Returns the current user's editable profile fields.")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getProfile(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        Map<String, Object> body = new HashMap<>();
        body.put("id",            user.getId());
        body.put("firstName",     user.getFirstName());
        body.put("lastName",      user.getLastName());
        body.put("email",         user.getEmail());
        body.put("officialEmail", user.getOfficialEmail());
        body.put("phoneNumber",   user.getPhoneNumber());
        body.put("emailVerified", user.isEmailVerified());
        body.put("phoneVerified", user.isPhoneVerified());
        body.put("mfaEnabled",    user.isMfaEnabled());
        body.put("status",        user.getStatus().name());
        return ResponseEntity.ok(body);
    }

    // ── PUT /auth/profile ─────────────────────────────────────────────────────

    @Operation(summary = "Update own profile",
            description = "Lets a user update their own first name, last name, and phone number.")
    @PutMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        String oldName = user.getFirstName() + " " + user.getLastName();

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        if (request.phoneNumber() != null && !request.phoneNumber().isBlank()) {
            user.setPhoneNumber(request.phoneNumber().trim());
        }

        userRepository.save(user);

        auditService.logEventWithActorAndIp(
                auth.getName(),
                "PROFILE_UPDATED",
                "USER-" + user.getId(),
                httpRequest.getRemoteAddr(),
                String.format("Name changed from '%s' to '%s %s'",
                        oldName, request.firstName(), request.lastName())
        );

        Map<String, Object> body = new HashMap<>();
        body.put("message",   "Profile updated successfully.");
        body.put("firstName", user.getFirstName());
        body.put("lastName",  user.getLastName());
        body.put("phoneNumber", user.getPhoneNumber());
        return ResponseEntity.ok(body);
    }
}