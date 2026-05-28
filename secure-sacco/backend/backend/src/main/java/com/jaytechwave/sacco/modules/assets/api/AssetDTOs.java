package com.jaytechwave.sacco.modules.assets.api;

import com.jaytechwave.sacco.modules.assets.domain.entity.AssetCategory;
import com.jaytechwave.sacco.modules.assets.domain.entity.AssetStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * DTOs for the Asset Management Module (SAC-221).
 * All records in a single file to match the existing module convention.
 */
public class AssetDTOs {

    // ── Inbound ───────────────────────────────────────────────────────────────

    public record RegisterAssetRequest(

            @NotBlank(message = "Asset name is required")
            @Size(max = 200)
            String assetName,

            @NotNull(message = "Category is required")
            AssetCategory category,

            @NotNull(message = "Purchase date is required")
            LocalDate purchaseDate,

            @NotNull(message = "Purchase cost is required")
            @DecimalMin(value = "0.01", message = "Purchase cost must be greater than zero")
            BigDecimal purchaseCost,

            @Size(max = 100)
            String serialNumber,

            String description,

            @Size(max = 200)
            String location,

            @Size(max = 200)
            String supplier,

            LocalDate warrantyExpiry
    ) {}

    public record UpdateAssetStatusRequest(

            @NotNull(message = "New status is required")
            AssetStatus newStatus,

            String disposalNotes
    ) {}

    // ── Outbound ──────────────────────────────────────────────────────────────

    public record AssetResponse(
            UUID            id,
            String          assetName,
            AssetCategory   category,
            AssetStatus     status,
            String          serialNumber,
            String          description,
            LocalDate       purchaseDate,
            BigDecimal      purchaseCost,
            String          glAccountCode,
            String          journalReference,
            String          location,
            String          supplier,
            LocalDate       warrantyExpiry,
            ZonedDateTime   disposedAt,
            String          disposalNotes,
            UUID            createdByUserId,
            ZonedDateTime   createdAt,
            ZonedDateTime   updatedAt
    ) {}
}
