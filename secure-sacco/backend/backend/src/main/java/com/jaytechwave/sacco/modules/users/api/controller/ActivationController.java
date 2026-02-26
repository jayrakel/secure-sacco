package com.jaytechwave.sacco.modules.users.api.controller;

import com.jaytechwave.sacco.modules.users.api.dto.ActivationDTOs.*;
import com.jaytechwave.sacco.modules.users.domain.service.UserActivationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/activation")
@RequiredArgsConstructor
public class ActivationController {

    private final UserActivationService activationService;

    @PostMapping("/otp/send")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody RequestTokenPayload payload) {
        activationService.requestNewOtp(payload.getEmail());
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully."));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpPayload payload) {
        activationService.verifyOtp(payload.getEmail(), payload.getCode());
        return ResponseEntity.ok(Map.of("message", "Phone verified successfully."));
    }

    @PostMapping("/email/send")
    public ResponseEntity<?> sendEmailToken(@Valid @RequestBody RequestTokenPayload payload) {
        activationService.requestNewEmailToken(payload.getEmail());
        return ResponseEntity.ok(Map.of("message", "Email token sent successfully."));
    }

    @PostMapping("/email/verify")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody VerifyEmailPayload payload) {
        activationService.verifyEmail(payload.getToken(), payload.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Email verified and password set successfully."));
    }
}