package com.jaytechwave.sacco.modules.core.setup;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoints for verifying email and phone of an already-authenticated user.
 *
 * <p>All endpoints require an active session (authenticated).
 * The email is taken from the session — no body field needed for "who am I".
 *
 * <pre>
 * POST /api/v1/auth/verify/email/send     — send email verification link
 * POST /api/v1/auth/verify/email/confirm  — confirm token from email link
 * POST /api/v1/auth/verify/phone/send     — send OTP SMS to registered phone
 * POST /api/v1/auth/verify/phone/confirm  — confirm 6-digit OTP
 * </pre>
 */
@RestController
@RequestMapping("/api/v1/auth/verify")
@RequiredArgsConstructor
public class ContactVerificationController {

    private final ContactVerificationService verificationService;

    // ── Email ─────────────────────────────────────────────────────────────────

    @PostMapping("/email/send")
    public ResponseEntity<?> sendEmailVerification(Authentication auth) {
        verificationService.sendEmailOtp(auth.getName());
        return ResponseEntity.ok(Map.of(
                "message", "Verification email sent. Please check your inbox and click the link."));
    }

    @PostMapping("/email/confirm")
    public ResponseEntity<?> confirmEmail(@RequestBody TokenRequest body, Authentication auth) {
        verificationService.confirmEmail(auth.getName(), body.getToken());
        return ResponseEntity.ok(Map.of("message", "Email verified successfully."));
    }

    // ── Phone ─────────────────────────────────────────────────────────────────

    @PostMapping("/phone/send")
    public ResponseEntity<?> sendPhoneOtp(Authentication auth) {
        verificationService.sendPhoneOtp(auth.getName());
        return ResponseEntity.ok(Map.of(
                "message", "OTP sent to your registered phone number."));
    }

    @PostMapping("/phone/confirm")
    public ResponseEntity<?> confirmPhone(@RequestBody TokenRequest body, Authentication auth) {
        verificationService.confirmPhone(auth.getName(), body.getToken());
        return ResponseEntity.ok(Map.of("message", "Phone number verified successfully."));
    }

    // ── DTO ───────────────────────────────────────────────────────────────────

    @Data
    public static class TokenRequest {
        private String token;
    }
}