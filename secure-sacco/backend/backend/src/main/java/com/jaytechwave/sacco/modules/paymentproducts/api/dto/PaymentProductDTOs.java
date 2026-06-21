package com.jaytechwave.sacco.modules.paymentproducts.api.dto;

import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

public class PaymentProductDTOs {

    // ── Admin: create/update a product ──────────────────────────────────────
    public record CreateProductRequest(
            @NotBlank String name,
            @NotBlank String code,
            String description,
            @NotNull ModuleType moduleType,
            @NotNull UUID glAccountId,
            Integer displayOrder,
            BigDecimal requiredAmount // optional per-member target, e.g. "KES 2,000 each"
    ) {}

    public record UpdateProductRequest(
            String name,
            String description,
            UUID glAccountId,
            Boolean isActive,
            Integer displayOrder,
            BigDecimal requiredAmount,
            Boolean clearRequiredAmount // explicit flag — distinguishes "leave unchanged" from "set to uncapped"
    ) {}

    public record ProductResponse(
            UUID id,
            String name,
            String code,
            String description,
            ModuleType moduleType,
            UUID glAccountId,
            String glAccountCode,
            String glAccountName,
            boolean isActive,
            boolean isSystem,
            int displayOrder,
            BigDecimal requiredAmount,
            ZonedDateTime createdAt
    ) {}

    // ── Member: allocation flow ──────────────────────────────────────────────

    /** One line in the member's split — e.g. 60% to Savings. */
    public record AllocationLine(
            @NotNull UUID productId,
            @NotNull BigDecimal percentage
    ) {}

    public record ValidateAllocationRequest(
            @NotNull BigDecimal totalAmount,
            @NotNull List<AllocationLine> allocations
    ) {}

    /**
     * Per-product progress shown on the allocation screen.
     * For LOAN/PENALTY: outstandingAmount = live outstanding balance, requiredAmount/paidAmount are null.
     * For CUSTOM with a target set: requiredAmount + paidAmount are populated, outstandingAmount = remaining.
     * For SAVINGS, or CUSTOM with no target: isCapped = false, all three amounts are null.
     */
    public record ProductAllocationContext(
            UUID productId,
            String productCode,
            String productName,
            ModuleType moduleType,
            boolean isCapped,
            BigDecimal outstandingAmount,  // remaining amount the member may still allocate, null when uncapped
            BigDecimal requiredAmount,     // the product's fixed per-member target, null if none set
            BigDecimal paidAmount          // how much this member has already routed to this product, null if requiredAmount is null
    ) {}

    public record ValidateAllocationResponse(
            boolean valid,
            String errorMessage,
            List<String> fieldErrors
    ) {}

    // ── Admin: per-product transaction history & statement (SAC-263) ─────────

    /**
     * One row in a product's transaction history — the "smart tab" that
     * automatically exists for every product, including custom ones, with
     * zero extra code per product. Reference is always the LIVE value from
     * the underlying payment (mpesaRef once known, internalRef before that) —
     * never a frozen copy, so it's correct from the moment IPN/mini-statement
     * confirms the M-Pesa transaction, with no separate reconciliation step.
     */
    public record ProductTransactionItem(
            UUID allocationId,
            String memberNumber,
            String memberName,
            BigDecimal amount,
            String status,       // PENDING | ROUTED | FAILED
            String reference,    // live payment.mpesaRef, falling back to internalRef
            ZonedDateTime createdAt,
            ZonedDateTime routedAt
    ) {}

    public record ProductTransactionPage(
            List<ProductTransactionItem> items,
            long totalElements,
            int totalPages,
            int page,
            int size,
            BigDecimal totalAmount   // sum of ROUTED amounts only — the product's true received total
    ) {}

    // ── Admin: reference lookup — every route one M-Pesa payment touched ─────

    /** One module/product this payment was (or will be) routed to. */
    public record RouteItem(
            String productName,
            ModuleType moduleType,
            BigDecimal amount,
            String status,      // PENDING | ROUTED | FAILED
            String failureReason,
            ZonedDateTime routedAt
    ) {}

    /**
     * SAC-264: search by M-Pesa reference (or internal ref, for payments still
     * awaiting confirmation) and see every route it was split across — savings,
     * penalty, loan, custom products — side by side, with one shared reference.
     */
    public record PaymentRouteLookupResponse(
            UUID paymentId,
            String mpesaRef,
            String internalRef,
            String memberNumber,
            String memberName,
            String senderPhoneNumber,
            BigDecimal totalAmount,
            String paymentStatus,    // PENDING | COMPLETED | FAILED
            String failureReason,
            ZonedDateTime createdAt,
            boolean isSplitDeposit,
            List<RouteItem> routes   // empty for a non-split, single-purpose deposit
    ) {}

    /** Sent when initiating the STK push for a split deposit. */
    public record InitiateSplitDepositRequest(
            @NotNull BigDecimal totalAmount,
            @NotBlank String phoneNumber,
            @NotNull List<AllocationLine> allocations
    ) {}

    // ── Member: split deposit status history (SAC-262) ───────────────────────

    /** One product's portion of a split deposit, with its own routing status. */
    public record AllocationStatusItem(
            String productName,
            BigDecimal amount,
            String status   // PENDING | ROUTED | FAILED
    ) {}

    /**
     * A single split deposit attempt and its real-time status — lets the member see
     * what actually happened (pending / completed / failed and why) instead of silence.
     */
    public record SplitDepositHistoryItem(
            UUID paymentId,
            String accountReference, // the SPLIT-xxx ref returned as checkoutRequestID from /initiate
            BigDecimal totalAmount,
            String status,          // PENDING | COMPLETED | FAILED
            String failureReason,   // populated only when status = FAILED
            ZonedDateTime createdAt,
            List<AllocationStatusItem> allocations
    ) {}
}