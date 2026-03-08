package com.jaytechwave.sacco.modules.savings.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Savings", description = "Deposits, withdrawals, M-Pesa STK push, statements")
public class SavingsController {

    private final SavingsService savingsService;

    @Operation(summary = "Manual deposit", description = "Post a manual savings deposit for a member. Requires SAVINGS_MANUAL_POST.")
    @PostMapping("/deposits/manual")
    // Fallback to ROLE_SYSTEM_ADMIN to ensure it works for you right away while building!
    @PreAuthorize("hasAnyAuthority('SAVINGS_MANUAL_POST', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<SavingsTransactionResponse> manualDeposit(@Valid @RequestBody ManualDepositRequest request) {
        return ResponseEntity.ok(savingsService.processManualDeposit(request));
    }

    @Operation(summary = "Manual withdrawal", description = "Post a manual savings withdrawal for a member. Requires SAVINGS_MANUAL_POST.")
    @PostMapping("/withdrawals/manual")
    @PreAuthorize("hasAnyAuthority('SAVINGS_MANUAL_POST', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<SavingsTransactionResponse> manualWithdrawal(@Valid @RequestBody ManualWithdrawalRequest request) {
        return ResponseEntity.ok(savingsService.processManualWithdrawal(request));
    }

    @Operation(summary = "Initiate M-Pesa deposit", description = "Triggers an STK push to the authenticated member's phone for a savings deposit.")
    @PostMapping("/deposits/mpesa/initiate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InitiateMpesaResponse> initiateMpesaDeposit(
            @Valid @RequestBody MpesaDepositRequest request,
            Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return ResponseEntity.ok(savingsService.initiateMpesaDeposit(request, userDetails.getUsername()));
    }

    @Operation(summary = "Get my savings balance", description = "Returns the authenticated member's current savings account balance.")
    @GetMapping("/me/balance")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SavingsBalanceResponse> getMyBalance(Authentication authentication) {
        return ResponseEntity.ok(savingsService.getMyBalance(authentication.getName()));
    }

    @Operation(summary = "Get my statement", description = "Returns the authenticated member's transaction statement, optionally filtered by date range.")
    @GetMapping("/me/statement")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<StatementTransactionResponse>> getMyStatement(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication) {

        return ResponseEntity.ok(savingsService.getMyStatement(authentication.getName(), from, to));
    }

    // Accountant/Staff Endpoint
    @Operation(summary = "Get member statement (staff)", description = "Returns a specific member's transaction statement. Requires SAVINGS_READ.")
    @GetMapping("/members/{memberId}/statement")
    @PreAuthorize("hasAnyAuthority('SAVINGS_READ', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<StatementTransactionResponse>> getMemberStatement(
            @PathVariable UUID memberId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(savingsService.getMemberStatement(memberId, from, to));
    }
}