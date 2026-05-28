package com.jaytechwave.sacco.modules.expense.api.controller;

import com.jaytechwave.sacco.modules.expense.api.dto.ExpenseClaimDTOs.*;
import com.jaytechwave.sacco.modules.expense.domain.service.ExpenseClaimService;
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

/**
 * REST controller for the Member Expense Reimbursement Module (SAC-220).
 *
 * <p>Base path: {@code /api/v1/expense-claims}
 *
 * <p>Security:
 * <ul>
 *   <li>Member endpoints require {@code ROLE_MEMBER}
 *   <li>Staff read endpoints require {@code EXPENSE_CLAIMS_READ}
 *   <li>Staff write/approve endpoints require {@code EXPENSE_CLAIMS_APPROVE}
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/expense-claims")
@RequiredArgsConstructor
@Tag(name = "Expense Claims", description = "Member expense reimbursement submission, approval, and tracking")
public class ExpenseClaimController {

    private final ExpenseClaimService expenseClaimService;

    // ── Member endpoints ──────────────────────────────────────────────────────

    @Operation(summary = "Get my expense claims",
            description = "Returns all expense claims submitted for the authenticated member, newest first.")
    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<List<ExpenseClaimResponse>> getMyClaims(Authentication auth) {
        return ResponseEntity.ok(expenseClaimService.getMyClaims(auth.getName()));
    }

    @Operation(summary = "Submit my own expense claim (member)",
            description = "An authenticated member submits their own expense claim. No member ID needed — resolved from session.")
    @PostMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<ExpenseClaimResponse> submitMyClaim(
            @Valid @RequestBody MemberSubmitExpenseClaimRequest request,
            Authentication auth) {
        return ResponseEntity.ok(expenseClaimService.submitMyClaim(request, auth.getName()));
    }

    // ── Staff endpoints ───────────────────────────────────────────────────────

    @Operation(summary = "Submit an expense claim (staff)",
            description = "Staff submits an expense claim on behalf of a member. Requires EXPENSE_CLAIMS_APPROVE.")
    @PostMapping
    @PreAuthorize("hasAnyAuthority('EXPENSE_CLAIMS_APPROVE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<ExpenseClaimResponse> submitClaim(
            @Valid @RequestBody SubmitExpenseClaimRequest request,
            Authentication auth) {
        return ResponseEntity.ok(expenseClaimService.submitClaim(request, auth.getName()));
    }

    @Operation(summary = "List all expense claims (staff)",
            description = "Returns all claims across all members. Requires EXPENSE_CLAIMS_READ.")
    @GetMapping("/staff")
    @PreAuthorize("hasAnyAuthority('EXPENSE_CLAIMS_READ', 'EXPENSE_CLAIMS_APPROVE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<ExpenseClaimResponse>> getAllClaims() {
        return ResponseEntity.ok(expenseClaimService.getAllClaims());
    }

    @Operation(summary = "Approve or reject an expense claim",
            description = "Reviews a PENDING claim. On approval, a GL journal entry is automatically posted. Requires EXPENSE_CLAIMS_APPROVE.")
    @PostMapping("/{id}/review")
    @PreAuthorize("hasAnyAuthority('EXPENSE_CLAIMS_APPROVE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<ExpenseClaimResponse> reviewClaim(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewExpenseClaimRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(
                expenseClaimService.reviewClaim(id, request, auth.getName(), httpRequest.getRemoteAddr())
        );
    }
}
