package com.jaytechwave.sacco.modules.penalties.api.controller;

import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PayPenaltyRequest;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltySummaryResponse;
import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyRepaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/penalties")
@RequiredArgsConstructor
public class PenaltyController {

    private final PenaltyRepaymentService penaltyRepaymentService;

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<List<PenaltySummaryResponse>> getMyOpenPenalties(Authentication authentication) {
        return ResponseEntity.ok(penaltyRepaymentService.getMemberOpenPenalties(authentication.getName()));
    }

    @PostMapping("/repay")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<InitiateStkResponse> initiatePenaltyRepayment(
            @Valid @RequestBody PayPenaltyRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(penaltyRepaymentService.initiateRepayment(request, authentication.getName()));
    }
}