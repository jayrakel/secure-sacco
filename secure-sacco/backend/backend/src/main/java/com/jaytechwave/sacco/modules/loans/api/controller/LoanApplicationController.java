package com.jaytechwave.sacco.modules.loans.api.controller;

import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.*;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanApplicationService;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/loans/applications")
@RequiredArgsConstructor
public class LoanApplicationController {

    private final LoanApplicationService loanApplicationService;

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<LoanApplicationResponse> createApplication(
            @Valid @RequestBody CreateLoanApplicationRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.createApplication(request, authentication.getName()));
    }

    @PostMapping("/{id}/pay-fee")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<InitiateStkResponse> payApplicationFee(
            @PathVariable UUID id,
            @Valid @RequestBody PayLoanFeeRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.initiateFeePayment(id, request, authentication.getName()));
    }
}