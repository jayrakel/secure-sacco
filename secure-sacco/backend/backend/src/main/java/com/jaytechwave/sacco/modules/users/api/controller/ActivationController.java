package com.jaytechwave.sacco.modules.users.api.controller;

import com.jaytechwave.sacco.modules.users.domain.service.UserActivationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/activation")
@RequiredArgsConstructor
public class ActivationController {

    private final UserActivationService activationService;

    // ==========================================
    // ENDPOINTS FOR THE REACT UI FLOW
    // ==========================================

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmailLink(@RequestBody Map<String, String> payload) {
        // Just ensures the token exists and isn't expired when the React page loads
        activationService.verifyActivationLink(payload.get("token"));
        return ResponseEntity.ok(Map.of("message", "Activation link is valid."));
    }

    @PostMapping("/complete")
    public ResponseEntity<?> completeActivation(@RequestBody CompleteActivationRequest request) {
        // Validates both OTP and Email, and sets the password
        activationService.completeActivation(request.getToken(), request.getOtp(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Account successfully activated. You may now log in."));
    }


    // ==========================================
    // MANUAL RETRY ENDPOINTS (For future UI elements)
    // ==========================================

    @PostMapping("/otp/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> payload) {
        activationService.requestNewOtp(payload.get("email"));
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully."));
    }

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