package com.jaytechwave.sacco.modules.payments.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaytechwave.sacco.modules.payments.api.dto.DarajaDTOs.StkCallbackResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final ObjectMapper objectMapper;
    private final UserRepository UserRepository;

    @PostMapping("/stk-push")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InitiateStkResponse> initiateStkPush
            (@Valid @RequestBody InitiateStkRequest request,
             Authentication authentication) {

        // Get the authenticated user's ID
        User user = UserRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UUID memberId = user.getMember() != null ? user.getMember().getId() : null;

        return ResponseEntity.ok(paymentService.initiateMpesaStkPush(request, memberId));
    }

    // --- NEW WEBHOOK ENDPOINT ---
    @PostMapping("/mpesa/stk-callback")
    // Note: No @PreAuthorize here because Safaricom calls this, not an authenticated user
    public ResponseEntity<Map<String, String>> handleStkCallback(@RequestBody String rawJsonBody) {
        log.info("Received Safaricom STK Webhook: {}", rawJsonBody);
        try {
            StkCallbackResponse response = objectMapper.readValue(rawJsonBody, StkCallbackResponse.class);
            paymentService.processStkCallback(rawJsonBody, response);

            // Safaricom expects a simple JSON response acknowledging receipt
            return ResponseEntity.ok(Map.of("ResultCode", "0", "ResultDesc", "Accepted"));
        } catch (Exception e) {
            log.error("Failed to process STK Callback", e);
            // We still return 200 OK so Safaricom doesn't endlessly retry delivery of a broken payload
            return ResponseEntity.ok(Map.of("ResultCode", "1", "ResultDesc", "Rejected internally"));
        }
    }
}