package com.jaytechwave.sacco.modules.assets.api;

import com.jaytechwave.sacco.modules.assets.api.AssetDTOs.*;
import com.jaytechwave.sacco.modules.assets.domain.entity.AssetStatus;
import com.jaytechwave.sacco.modules.assets.domain.service.AssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for the Asset Management Module (SAC-221).
 *
 * <p>Base path: {@code /api/v1/assets}
 *
 * <p>Permissions:
 * <ul>
 *   <li>{@code ASSET_READ}    — GET endpoints</li>
 *   <li>{@code ASSET_WRITE}   — POST /assets (register)</li>
 *   <li>{@code ASSET_DISPOSE} — PATCH /assets/{id}/status (change status)</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;

    // ── Register a new asset ──────────────────────────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ASSET_WRITE')")
    public AssetResponse registerAsset(
            @Valid @RequestBody RegisterAssetRequest request,
            Principal principal
    ) {
        return assetService.registerAsset(request, principal.getName());
    }

    // ── List all assets ───────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('ASSET_READ')")
    public List<AssetResponse> listAssets(
            @RequestParam(required = false) AssetStatus status
    ) {
        if (status != null) {
            return assetService.listByStatus(status);
        }
        return assetService.listAll();
    }

    // ── Get single asset ──────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ASSET_READ')")
    public AssetResponse getAsset(@PathVariable UUID id) {
        return assetService.getById(id);
    }

    // ── Update asset status ───────────────────────────────────────────────────

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ASSET_DISPOSE')")
    public AssetResponse updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAssetStatusRequest request,
            Principal principal
    ) {
        return assetService.updateStatus(id, request, principal.getName());
    }
}
