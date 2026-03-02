package com.jaytechwave.sacco.modules.savings.api.controller;

import com.jaytechwave.sacco.modules.savings.api.dto.SavingsDTOs.*;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/savings")
@RequiredArgsConstructor
public class SavingsController {

    private final SavingsService savingsService;

    @PostMapping("/deposits/manual")
    // Fallback to ROLE_SYSTEM_ADMIN to ensure it works for you right away while building!
    @PreAuthorize("hasAnyAuthority('SAVINGS_MANUAL_POST', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<SavingsTransactionResponse> manualDeposit(@Valid @RequestBody ManualDepositRequest request) {
        return ResponseEntity.ok(savingsService.processManualDeposit(request));
    }
}