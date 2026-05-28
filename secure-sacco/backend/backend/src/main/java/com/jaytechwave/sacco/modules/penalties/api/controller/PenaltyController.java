package com.jaytechwave.sacco.modules.penalties.api.controller;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PayPenaltyRequest;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltySummaryResponse;
import com.jaytechwave.sacco.modules.penalties.domain.entity.Penalty;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyStatus;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/penalties")
@RequiredArgsConstructor
@Tag(name = "Penalties", description = "Penalty rules, accrual, payment, and waiver")
public class PenaltyController {

    private final PenaltyRepaymentService penaltyRepaymentService;
    private final PenaltyService          penaltyService;
    private final PenaltyRepository       penaltyRepository;
    private final MemberRepository        memberRepository;

    // ── Member endpoints ──────────────────────────────────────────────────────

    @Operation(summary = "Get my open penalties")
    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<List<PenaltySummaryResponse>> getMyOpenPenalties(Authentication auth) {
        return ResponseEntity.ok(penaltyRepaymentService.getMemberOpenPenalties(auth.getName()));
    }

    @Operation(summary = "Pay penalty via M-Pesa")
    @PostMapping("/repay")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<InitiateStkResponse> initiatePenaltyRepayment(
            @Valid @RequestBody PayPenaltyRequest request, Authentication auth) {
        return ResponseEntity.ok(penaltyRepaymentService.initiateRepayment(request, auth.getName()));
    }

    // ── Staff endpoints ───────────────────────────────────────────────────────

    /**
     * Staff view of all open penalties — used by the Penalty Waiver UI.
     * Returns open penalties enriched with member number and name for display.
     */
    @Operation(summary = "List all open penalties (staff)",
            description = "Returns all OPEN penalties across all members. Requires PENALTIES_WAIVE_ADJUST.")
    @GetMapping("/staff")
    @PreAuthorize("hasAnyAuthority('PENALTIES_WAIVE_ADJUST', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllOpenPenalties() {
        List<Penalty> open = penaltyRepository.findByStatusWithPenaltyRule(PenaltyStatus.OPEN);

        List<Map<String, Object>> result = open.stream().map(p -> {
            Member member = memberRepository.findById(p.getMemberId()).orElse(null);
            String memberNumber = member != null ? member.getMemberNumber() : "Unknown";
            String memberName   = member != null
                    ? member.getFirstName() + " " + member.getLastName()
                    : "Unknown";

            Map<String, Object> row = new java.util.HashMap<>();
            row.put("id",              p.getId().toString());
            row.put("memberId",        p.getMemberId().toString());
            row.put("memberNumber",    memberNumber);
            row.put("memberName",      memberName);
            row.put("ruleCode",        p.getPenaltyRule().getCode());
            row.put("ruleName",        p.getPenaltyRule().getName());
            row.put("originalAmount",  p.getOriginalAmount());
            row.put("outstandingAmount", p.getOutstandingAmount());
            row.put("amountWaived",    p.getAmountWaived());
            row.put("status",          p.getStatus().name());
            row.put("createdAt",       p.getCreatedAt().toString());
            return row;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Waive penalty",
            description = "Partially or fully waive a penalty. Requires PENALTIES_WAIVE_ADJUST.")
    @PostMapping("/{id}/waive")
    @PreAuthorize("hasAnyAuthority('PENALTIES_WAIVE_ADJUST', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<PenaltySummaryResponse> waivePenalty(
            @PathVariable UUID id,
            @Valid @RequestBody PenaltyDTOs.WaivePenaltyRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(
                penaltyService.waivePenalty(id, request, auth.getName(), httpRequest.getRemoteAddr())
        );
    }
}