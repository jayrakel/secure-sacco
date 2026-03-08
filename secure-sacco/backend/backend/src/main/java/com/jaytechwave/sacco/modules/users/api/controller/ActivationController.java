package com.jaytechwave.sacco.modules.users.api.controller;

import com.jaytechwave.sacco.modules.users.domain.service.UserActivationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/activation")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, logout, MFA, password reset")
public class ActivationController {

    private final UserActivationService activationService;

    // ==========================================
    // ENDPOINTS FOR THE REACT UI FLOW
    // ==========================================

    @Operation(summary = "Verify activation link", description = "Validates that an email activation token exists and has not expired.")
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmailLink(@RequestBody Map<String, String> payload) {
        // Just ensures the token exists and isn't expired when the React page loads
        activationService.verifyActivationLink(payload.get("token"));
        return ResponseEntity.ok(Map.of("message", "Activation link is valid."));
    }

    @Operation(summary = "Complete account activation", description = "Sets the user's password using a valid email token + OTP pair.")
    @PostMapping("/complete")
    public ResponseEntity<?> completeActivation(@RequestBody CompleteActivationRequest request) {
        // Validates both OTP and Email, and sets the password
        activationService.completeActivation(request.getToken(), request.getOtp(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Account successfully activated. You may now log in."));
    }


    // ==========================================
    // MANUAL RETRY ENDPOINTS (For future UI elements)
    // ==========================================

    @Operation(summary = "Resend OTP")
    @PostMapping("/otp/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> payload) {
        activationService.requestNewOtp(payload.get("email"));
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully."));
    }

    @Operation(summary = "Resend activation email")
    @PostMapping("/email/send")
    public ResponseEntity<?> sendEmailToken(@RequestBody Map<String, String> payload) {
        activationService.requestNewEmailToken(payload.get("email"));
        return ResponseEntity.ok(Map.of("message", "Email token sent successfully."));
    }

    // --- Inner DTO for Completion ---
    @Data
    public static class CompleteActivationRequest {
        private String token;
        private String otp;
        private String newPassword;
    }
}