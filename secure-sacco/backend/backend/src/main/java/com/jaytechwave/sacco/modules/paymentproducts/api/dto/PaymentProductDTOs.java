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
            Integer displayOrder
    ) {}

    public record UpdateProductRequest(
            String name,
            String description,
            UUID glAccountId,
            Boolean isActive,
            Integer displayOrder
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

    /** Per-product outstanding context shown on the allocation screen. */
    public record ProductAllocationContext(
            UUID productId,
            String productCode,
            String productName,
            ModuleType moduleType,
            boolean isCapped,
            BigDecimal outstandingAmount   // null when not capped (SAVINGS/CUSTOM)
    ) {}

    public record ValidateAllocationResponse(
            boolean valid,
            String errorMessage,
            List<String> fieldErrors
    ) {}

    /** Sent when initiating the STK push for a split deposit. */
    public record InitiateSplitDepositRequest(
            @NotNull BigDecimal totalAmount,
            @NotBlank String phoneNumber,
            @NotNull List<AllocationLine> allocations
    ) {}
}