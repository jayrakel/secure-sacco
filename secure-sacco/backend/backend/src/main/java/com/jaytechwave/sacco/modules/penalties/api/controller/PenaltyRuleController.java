package com.jaytechwave.sacco.modules.penalties.api.controller;

import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltyRuleRequest;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltyRuleResponse;
import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/penalties/rules")
@RequiredArgsConstructor
public class PenaltyRuleController {

    private final PenaltyRuleService penaltyRuleService;

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<PenaltyRuleResponse> createRule(@Valid @RequestBody PenaltyRuleRequest request) {
        return ResponseEntity.ok(penaltyRuleService.createRule(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<PenaltyRuleResponse> updateRule(
            @PathVariable UUID id,
            @Valid @RequestBody PenaltyRuleRequest request) {
        return ResponseEntity.ok(penaltyRuleService.updateRule(id, request));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PenaltyRuleResponse>> getAllRules(
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(penaltyRuleService.getAllRules(activeOnly));
    }
}