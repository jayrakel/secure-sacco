package com.jaytechwave.sacco.modules.expense.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * All DTOs for the Expense Reimbursement Module (SAC-220).
 */
public class ExpenseClaimDTOs {

    // ── Requests ──────────────────────────────────────────────────────────────

    /**
     * Used by staff (Treasurer/Admin) to submit a claim on behalf of a member.
     */
    public record SubmitExpenseClaimRequest(
            @NotNull(message = "Member ID is required")
            UUID memberId,

            @NotNull(message = "Amount is required")
            @DecimalMin(value = "1.0", message = "Amount must be at least KES 1")
            BigDecimal amount,

            @NotBlank(message = "Description is required")
            String description,

            String receiptReference
    ) {}

    /**
     * Used by an authenticated MEMBER to submit their own expense claim.
     * No {@code memberId} field — the member's identity is resolved from the JWT/session.
     */
    public record MemberSubmitExpenseClaimRequest(
            @NotNull(message = "Amount is required")
            @DecimalMin(value = "1.0", message = "Amount must be at least KES 1")
            BigDecimal amount,

            @NotBlank(message = "Description is required")
            String description,

            String receiptReference
    ) {}

    /**
     * Used by a Treasurer/Admin to approve or reject a PENDING claim.
     * If {@code approved} is false, {@code rejectionReason} is mandatory.
     */
    public record ReviewExpenseClaimRequest(
            @NotNull(message = "Approved flag is required")
            Boolean approved,

            String rejectionReason
    ) {}

    // ── Responses ─────────────────────────────────────────────────────────────

    /**
     * Full claim response returned from all read and write endpoints.
     */
    public record ExpenseClaimResponse(
            UUID id,
            UUID memberId,
            String memberNumber,
            String memberName,
            BigDecimal amount,
            String description,
            String receiptReference,
            String status,
            String rejectionReason,
            UUID reviewedByUserId,
            ZonedDateTime reviewedAt,
            String journalReference,
            ZonedDateTime createdAt
    ) {}
}
