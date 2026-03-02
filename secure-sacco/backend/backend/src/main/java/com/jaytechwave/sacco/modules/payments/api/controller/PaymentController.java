package com.jaytechwave.sacco.modules.payments.api.controller;

import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/stk-push")
    @PreAuthorize("isAuthenticated()") // Ensure user is logged in
    public ResponseEntity<InitiateStkResponse> initiateStkPush(@Valid @RequestBody InitiateStkRequest request) {
        InitiateStkResponse response = paymentService.initiateMpesaStkPush(request);
        return ResponseEntity.ok(response);
    }
}