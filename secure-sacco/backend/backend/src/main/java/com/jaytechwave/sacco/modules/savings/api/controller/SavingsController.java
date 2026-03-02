package com.jaytechwave.sacco.modules.savings.api.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import com.jaytechwave.sacco.modules.core.security.CustomUserDetailsService.CustomUserDetails;
import com.jaytechwave.sacco.modules.savings.api.dto.SavingsDTOs.*;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

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

    @PostMapping("/withdrawals/manual")
    @PreAuthorize("hasAnyAuthority('SAVINGS_MANUAL_POST', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<SavingsTransactionResponse> manualWithdrawal(@Valid @RequestBody ManualWithdrawalRequest request) {
        return ResponseEntity.ok(savingsService.processManualWithdrawal(request));
    }

    @PostMapping("/deposits/mpesa/initiate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InitiateMpesaResponse> initiateMpesaDeposit(
            @Valid @RequestBody MpesaDepositRequest request,
            Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return ResponseEntity.ok(savingsService.initiateMpesaDeposit(request, userDetails.getUsername()));
    }

    @GetMapping("/me/balance")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SavingsBalanceResponse> getMyBalance(Authentication authentication) {
        return ResponseEntity.ok(savingsService.getMyBalance(authentication.getName()));
    }

    @GetMapping("/me/statement")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<StatementTransactionResponse>> getMyStatement(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication) {

        return ResponseEntity.ok(savingsService.getMyStatement(authentication.getName(), from, to));
    }

    // Accountant/Staff Endpoint
    @GetMapping("/members/{memberId}/statement")
    @PreAuthorize("hasAnyAuthority('SAVINGS_READ', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<StatementTransactionResponse>> getMemberStatement(
            @PathVariable UUID memberId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(savingsService.getMemberStatement(memberId, from, to));
    }
}