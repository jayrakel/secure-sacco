package com.jaytechwave.sacco.modules.penalties.api.controller;

import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PayPenaltyRequest;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltySummaryResponse;
import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyRepaymentService;
import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/penalties")
@RequiredArgsConstructor
@Tag(name = "Penalties", description = "Penalty rules, accrual, payment, and waiver")
public class PenaltyController {

    private final PenaltyRepaymentService penaltyRepaymentService;
    private final PenaltyService penaltyService;

    @Operation(summary = "Get my open penalties", description = "Returns all open penalties for the authenticated member.")
    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<List<PenaltySummaryResponse>> getMyOpenPenalties(Authentication authentication) {
        return ResponseEntity.ok(penaltyRepaymentService.getMemberOpenPenalties(authentication.getName()));
    }

    @Operation(summary = "Pay penalty via M-Pesa", description = "Triggers an STK push to pay a member's outstanding penalty.")
    @PostMapping("/repay")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<InitiateStkResponse> initiatePenaltyRepayment(
            @Valid @RequestBody PayPenaltyRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(penaltyRepaymentService.initiateRepayment(request, authentication.getName()));
    }

    @Operation(summary = "Waive penalty", description = "Partially or fully waive a penalty. Requires PENALTIES_WAIVE_ADJUST.")
    @PostMapping("/{id}/waive")
    @PreAuthorize("hasAuthority('PENALTIES_WAIVE_ADJUST')")
    public ResponseEntity<PenaltySummaryResponse> waivePenalty(
            @PathVariable UUID id,
            @Valid @RequestBody PenaltyDTOs.WaivePenaltyRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        return ResponseEntity.ok(penaltyService.waivePenalty(
                id, request, authentication.getName(), httpRequest.getRemoteAddr()
        ));
    }
}