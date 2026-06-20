package com.jaytechwave.sacco.modules.paymentproducts.api.controller;

import com.jaytechwave.sacco.modules.core.security.CustomUserDetailsService.CustomUserDetails;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.service.DepositAllocationValidationService;
import com.jaytechwave.sacco.modules.paymentproducts.domain.service.SplitDepositService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/deposits/split")
@RequiredArgsConstructor
@Tag(name = "Split Deposit", description = "Member self-service: one M-Pesa payment split across multiple products")
public class SplitDepositController {

    private final DepositAllocationValidationService validationService;
    private final SplitDepositService                splitDepositService;
    private final MemberRepository                   memberRepository;

    @Operation(summary = "Get allocation context — outstanding balances per product for the allocation screen")
    @GetMapping("/context")
    @PreAuthorize("hasAuthority('MEMBER_SAVINGS_VIEW')")
    public ResponseEntity<List<ProductAllocationContext>> getContext(Authentication authentication) {
        UUID memberId = resolveMemberId(authentication);
        return ResponseEntity.ok(validationService.getAllocationContext(memberId));
    }

    @Operation(summary = "Validate a proposed allocation before showing the phone-number step")
    @PostMapping("/validate")
    @PreAuthorize("hasAuthority('MEMBER_SAVINGS_VIEW')")
    public ResponseEntity<ValidateAllocationResponse> validate(
            Authentication authentication, @Valid @RequestBody ValidateAllocationRequest request) {
        UUID memberId = resolveMemberId(authentication);
        return ResponseEntity.ok(validationService.validate(memberId, request));
    }

    @Operation(summary = "Initiate the STK push for a validated split deposit")
    @PostMapping("/initiate")
    @PreAuthorize("hasAuthority('MEMBER_SAVINGS_VIEW')")
    public ResponseEntity<InitiateStkResponse> initiate(
            Authentication authentication, @Valid @RequestBody InitiateSplitDepositRequest request) {
        UUID memberId = resolveMemberId(authentication);
        return ResponseEntity.ok(splitDepositService.initiateSplitDeposit(request, memberId));
    }

    @Operation(summary = "SAC-262: real status of the member's recent split deposits — PENDING/COMPLETED/FAILED with reason")
    @GetMapping("/my-recent")
    @PreAuthorize("hasAuthority('MEMBER_SAVINGS_VIEW')")
    public ResponseEntity<List<SplitDepositHistoryItem>> getMyRecent(Authentication authentication) {
        UUID memberId = resolveMemberId(authentication);
        return ResponseEntity.ok(splitDepositService.getMyRecentSplitDeposits(memberId, 10));
    }

    private UUID resolveMemberId(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return memberRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new IllegalStateException("No member linked to this account"))
                .getId();
    }
}