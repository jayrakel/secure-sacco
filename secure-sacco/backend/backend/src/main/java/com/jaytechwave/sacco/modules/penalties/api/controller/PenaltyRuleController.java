package com.jaytechwave.sacco.modules.penalties.api.controller;

import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltyRuleRequest;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltyRuleResponse;
import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyRuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Penalties", description = "Penalty rules, accrual, payment, and waiver")
public class PenaltyRuleController {

    private final PenaltyRuleService penaltyRuleService;

    @Operation(summary = "List penalty rules")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PenaltyRuleResponse>> listRules(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(penaltyRuleService.getAllRules(activeOnly));
    }

    @Operation(summary = "Create penalty rule",
            description = "Define a new penalty rule. Requires PENALTIES_MANAGE_RULES or SYSTEM_ADMIN.")
    @PostMapping
    @PreAuthorize("hasAnyAuthority('PENALTIES_MANAGE_RULES', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<PenaltyRuleResponse> createRule(@Valid @RequestBody PenaltyRuleRequest request) {
        return ResponseEntity.ok(penaltyRuleService.createRule(request));
    }

    @Operation(summary = "Update penalty rule",
            description = "Modify an existing penalty rule. Requires PENALTIES_MANAGE_RULES or SYSTEM_ADMIN.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PENALTIES_MANAGE_RULES', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<PenaltyRuleResponse> updateRule(
            @PathVariable UUID id,
            @Valid @RequestBody PenaltyRuleRequest request) {
        return ResponseEntity.ok(penaltyRuleService.updateRule(id, request));
    }
}