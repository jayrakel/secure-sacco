package com.jaytechwave.sacco.modules.payments.api.controller;

import com.jaytechwave.sacco.modules.payments.api.dto.ManualPaymentDTOs.*;
import com.jaytechwave.sacco.modules.payments.domain.service.ManualPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * SAC-267: unified manual payment recording — one wizard, one endpoint,
 * every module. Lets staff record a cash payment for Savings, Penalty,
 * Loan Repayment, or a Custom product, without needing a separate screen
 * per module.
 */
@RestController
@RequestMapping("/api/v1/staff/manual-payments")
@RequiredArgsConstructor
@Tag(name = "Manual Payments", description = "Staff-recorded cash payments across all modules")
public class ManualPaymentController {

    private final ManualPaymentService manualPaymentService;

    @Operation(summary = "What can this member pay toward right now? (open penalties, active loan, active custom products)")
    @GetMapping("/context/{memberId}")
    @PreAuthorize("hasAuthority('MANUAL_PAYMENT_POST')")
    public ResponseEntity<ManualPaymentContext> getContext(@PathVariable UUID memberId) {
        return ResponseEntity.ok(manualPaymentService.getContext(memberId));
    }

    @Operation(summary = "Record a manual cash payment for any module")
    @PostMapping
    @PreAuthorize("hasAuthority('MANUAL_PAYMENT_POST')")
    public ResponseEntity<ManualPaymentResponse> recordPayment(@Valid @RequestBody ManualPaymentRequest request) {
        return ResponseEntity.ok(manualPaymentService.recordPayment(request));
    }
}