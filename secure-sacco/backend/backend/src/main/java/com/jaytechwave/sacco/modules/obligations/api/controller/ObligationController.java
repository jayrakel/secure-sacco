package com.jaytechwave.sacco.modules.obligations.api.controller;

import com.jaytechwave.sacco.modules.core.api.dto.PagedResponse;
import com.jaytechwave.sacco.modules.core.security.CustomUserDetailsService.CustomUserDetails;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.obligations.api.dto.ObligationDTOs.*;
import com.jaytechwave.sacco.modules.obligations.domain.service.ObligationPeriodService;
import com.jaytechwave.sacco.modules.obligations.domain.service.ObligationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/obligations")
@RequiredArgsConstructor
@Tag(name = "Savings Obligations", description = "Required savings obligations, compliance, and period tracking")
public class ObligationController {

    private final ObligationService       obligationService;
    private final ObligationPeriodService periodService;
    private final MemberRepository        memberRepository;

    // ── Staff: create ────────────────────────────────────────────────────────

    @Operation(summary = "Create a savings obligation for a member")
    @PostMapping
    @PreAuthorize("hasAnyAuthority('SAVINGS_OBLIGATIONS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<ObligationResponse> createObligation(
            @Valid @RequestBody CreateObligationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(obligationService.createObligation(request));
    }

    // ── Staff: edit obligation terms ──────────────────────────────────────────

    @Operation(summary = "Edit an obligation's amount, start date or grace period",
            description = "Only the fields included in the request body are changed. " +
                    "Send only what you want to update — all fields are optional.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SAVINGS_OBLIGATIONS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<ObligationResponse> updateObligation(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateObligationRequest request) {
        return ResponseEntity.ok(obligationService.updateObligation(id, request));
    }

    // ── Staff: pause / resume ────────────────────────────────────────────────

    @Operation(summary = "Pause or resume an obligation")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('SAVINGS_OBLIGATIONS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<ObligationResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateObligationStatusRequest request) {
        return ResponseEntity.ok(obligationService.updateStatus(id, request));
    }

    // ── Staff: lookup by member ───────────────────────────────────────────────

    @Operation(summary = "Get all obligations for a specific member (staff view)")
    @GetMapping("/member/{memberId}")
    @PreAuthorize("hasAnyAuthority('SAVINGS_OBLIGATIONS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<ObligationResponse>> getByMember(@PathVariable UUID memberId) {
        return ResponseEntity.ok(obligationService.getObligationsByMemberId(memberId));
    }

    @Operation(summary = "Get obligation period history for a specific member (staff view)")
    @GetMapping("/member/{memberId}/history")
    @PreAuthorize("hasAnyAuthority('SAVINGS_OBLIGATIONS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<PagedResponse<ObligationPeriodResponse>> getMemberHistory(
            @PathVariable UUID memberId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<ObligationPeriodResponse> result = obligationService.getMyHistory(memberId, pageable);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    // ── Staff: compliance report ──────────────────────────────────────────────

    @Operation(summary = "Staff compliance report — who is behind on savings",
            description = "Returns all active obligations with overdue period counts and total shortfall.")
    @GetMapping("/compliance")
    @PreAuthorize("hasAnyAuthority('SAVINGS_OBLIGATIONS_MANAGE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<PagedResponse<ObligationComplianceEntry>> getComplianceReport(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("totalShortfall").descending());
        Page<ObligationComplianceEntry> result = obligationService.getComplianceReport(pageable);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    // ── Staff: trigger evaluation ─────────────────────────────────────────────

    @Operation(summary = "Manually trigger the obligation evaluation job",
            description = "Evaluates all active obligations right now. Admin only.")
    @PostMapping("/evaluate")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> triggerEvaluation() {
        periodService.evaluateAll();
        return ResponseEntity.ok(Map.of("message", "Obligation evaluation triggered successfully."));
    }

    // ── Member: my obligations ────────────────────────────────────────────────

    @Operation(summary = "My current savings obligations",
            description = "Returns the authenticated member's active obligation(s) with current period status.")
    @GetMapping("/my")
    @PreAuthorize("hasAnyAuthority('SAVINGS_OBLIGATIONS_READ', 'ROLE_MEMBER', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<ObligationResponse>> getMyObligations(Authentication authentication) {
        UUID memberId = resolveMemberId(authentication);
        return ResponseEntity.ok(obligationService.getMyObligations(memberId));
    }

    @Operation(summary = "My savings obligation period history")
    @GetMapping("/my/history")
    @PreAuthorize("hasAnyAuthority('SAVINGS_OBLIGATIONS_READ', 'ROLE_MEMBER', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<PagedResponse<ObligationPeriodResponse>> getMyHistory(
            Authentication authentication,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID memberId = resolveMemberId(authentication);
        PageRequest pageable = PageRequest.of(page, size);
        Page<ObligationPeriodResponse> result = obligationService.getMyHistory(memberId, pageable);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UUID resolveMemberId(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return memberRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new IllegalStateException("No member linked to this account"))
                .getId();
    }
}