package com.jaytechwave.sacco.modules.core.controller;

import com.jaytechwave.sacco.modules.core.setup.ContactVerificationService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/profile")
@RequiredArgsConstructor
@Tag(name = "Profile", description = "Self-service profile management for authenticated users")
public class ProfileController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final SecurityAuditService auditService;
    private final ContactVerificationService contactVerificationService;

    // ── DTOs ─────────────────────────────────────────────────────────────────

    public record UpdateProfileRequest(
            @NotBlank(message = "First name is required") String firstName,
            @NotBlank(message = "Last name is required")  String lastName,
            String email,           // optional; null = keep existing
            String phoneNumber,     // optional; null = keep existing
            String otp              // required only if email or phone is changing
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
        body.put("profilePhotoUrl", user.getProfilePhotoUrl());
        return ResponseEntity.ok(body);
    }

    // ── POST /auth/profile/authorize-change ───────────────────────────────────

    @Operation(summary = "Request Profile Change OTP",
            description = "Sends an OTP to the user's current phone/email to authorize sensitive profile changes.")
    @PostMapping("/authorize-change")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> authorizeProfileChange(Authentication auth) {
        // We autowire ContactVerificationService below via constructor? 
        // Wait, ProfileController doesn't have ContactVerificationService injected yet.
        // Let's assume we'll inject it.
        contactVerificationService.sendProfileUpdateOtp(auth.getName());
        return ResponseEntity.ok(Map.of("message", "OTP sent to your verified contact method."));
    }


    // ── PUT /auth/profile ─────────────────────────────────────────────────────

    @Operation(summary = "Update own profile",
            description = "Lets a user update their own profile. Changing email or phone requires an OTP.")
    @PutMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        String oldName = user.getFirstName() + " " + user.getLastName();

        boolean sensitiveChange = false;

        String newPhone = request.phoneNumber() == null || request.phoneNumber().trim().isEmpty() ? null : request.phoneNumber().trim();
        if (newPhone != null && !newPhone.equals(user.getPhoneNumber())) {
            sensitiveChange = true;
        }

        String newEmail = request.email() == null || request.email().trim().isEmpty() ? null : request.email().trim().toLowerCase();
        if (newEmail != null && !newEmail.equals(user.getEmail())) {
            sensitiveChange = true;
        }

        if (sensitiveChange) {
            if (request.otp() == null || request.otp().trim().isEmpty()) {
                throw new IllegalArgumentException("OTP is required to change email or phone number.");
            }
            contactVerificationService.verifyProfileUpdateOtp(auth.getName(), request.otp().trim());
        }

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        
        if (newPhone != null && !newPhone.equals(user.getPhoneNumber())) {
            user.setPhoneNumber(newPhone);
            user.setPhoneVerified(false);
        }

        if (newEmail != null && !newEmail.equals(user.getEmail())) {
            // Check if email is already taken
            if (userRepository.existsByEmail(newEmail)) {
                throw new IllegalArgumentException("Email is already in use by another account.");
            }
            user.setEmail(newEmail);
            user.setEmailVerified(false);
        }

        userRepository.save(user);

        auditService.logEventWithActorAndIp(
                auth.getName(), // Note: auth.getName() is the OLD email, which is fine for audit log actor.
                "PROFILE_UPDATED",
                "USER-" + user.getId(),
                httpRequest.getRemoteAddr(),
                String.format("Profile updated (Sensitive: %b)", sensitiveChange)
        );

        Map<String, Object> body = new HashMap<>();
        body.put("message",   "Profile updated successfully.");
        body.put("firstName", user.getFirstName());
        body.put("lastName",  user.getLastName());
        body.put("email",     user.getEmail());
        body.put("phoneNumber", user.getPhoneNumber());
        return ResponseEntity.ok(body);
    }

    // ── POST /auth/profile/photo (Self-Service Photo Upload) ──────────────────

    @Operation(summary = "Upload own profile photo", description = "Upload a profile photo for the authenticated user.")
    @PostMapping("/photo")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> uploadOwnProfilePhoto(
            @RequestParam("photo") MultipartFile photo,
            Authentication auth) throws IOException {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        userService.uploadProfilePhoto(user.getId(), photo);
        return ResponseEntity.ok(Map.of("message", "Profile photo uploaded successfully"));
    }

    // ── GET /auth/profile/photo ───────────────────────────────────────────────

    @Operation(summary = "Get own profile photo", description = "Get the authenticated user's profile photo binary.")
    @GetMapping("/photo")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> getOwnProfilePhoto(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        return ResponseEntity.ok(userService.getProfilePhoto(user.getId()));
    }
}