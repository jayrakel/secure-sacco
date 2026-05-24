package com.jaytechwave.sacco.modules.assets.domain.service;

import com.jaytechwave.sacco.modules.assets.api.AssetDTOs;
import com.jaytechwave.sacco.modules.assets.api.AssetDTOs.*;
import com.jaytechwave.sacco.modules.assets.domain.entity.AssetStatus;
import com.jaytechwave.sacco.modules.assets.domain.entity.SaccoAsset;
import com.jaytechwave.sacco.modules.assets.domain.repository.AssetRepository;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Business logic for the Asset Management Module (SAC-221).
 *
 * <p>Rules enforced:
 * <ul>
 *   <li>No physical deletion — status changes only.</li>
 *   <li>DISPOSED and WRITTEN_OFF are terminal; no further transitions allowed.</li>
 *   <li>Every asset registration posts a GL journal entry (DR asset / CR bank 1110).</li>
 *   <li>Every write operation is logged via {@link SecurityAuditService}.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssetService {

    private final AssetRepository      assetRepository;
    private final JournalEntryService  journalEntryService;
    private final SecurityAuditService securityAuditService;
    private final UserRepository       userRepository;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Register a new SACCO-owned asset and post the acquisition GL entry.
     *
     * @param req        validated registration request
     * @param actorEmail email of the staff member performing the registration
     * @return the persisted asset as a response DTO
     */
    @Transactional
    public AssetResponse registerAsset(RegisterAssetRequest req, String actorEmail) {
        UUID actorId = resolveUserId(actorEmail);

        SaccoAsset asset = SaccoAsset.builder()
                .assetName(req.assetName())
                .category(req.category())
                .status(AssetStatus.ACTIVE)
                .serialNumber(req.serialNumber())
                .description(req.description())
                .purchaseDate(req.purchaseDate())
                .purchaseCost(req.purchaseCost())
                .glAccountCode(req.category().getGlAccountCode())
                .location(req.location())
                .supplier(req.supplier())
                .warrantyExpiry(req.warrantyExpiry())
                .createdByUserId(actorId)
                .build();

        SaccoAsset saved = assetRepository.save(asset);

        // Post GL acquisition entry — idempotency guard inside JournalEntryService
        String journalRef = "ASSET-" + saved.getId();
        journalEntryService.postAssetAcquisition(
                saved.getId(),
                saved.getAssetName(),
                saved.getPurchaseCost(),
                saved.getGlAccountCode()
        );
        saved.setJournalReference(journalRef);
        saved = assetRepository.save(saved);

        securityAuditService.logEvent(
                "ASSET_REGISTERED",
                "ASSET-" + saved.getId(),
                String.format("Asset registered by %s: %s [%s] cost=%s ref=%s",
                        actorEmail, saved.getAssetName(), saved.getCategory(),
                        saved.getPurchaseCost(), journalRef)
        );

        log.info("SAC-221: Asset {} registered by {} ref={}", saved.getId(), actorEmail, journalRef);
        return toResponse(saved);
    }

    /**
     * Update the status of an existing asset.
     *
     * <p>Validates that:
     * <ul>
     *   <li>The current status is not terminal (DISPOSED / WRITTEN_OFF).</li>
     *   <li>Disposal notes are provided when moving to DISPOSED or WRITTEN_OFF.</li>
     * </ul>
     *
     * @param id         UUID of the asset to update
     * @param req        status change request
     * @param actorEmail email of the staff member making the change
     * @return updated asset as a response DTO
     */
    @Transactional
    public AssetResponse updateStatus(UUID id, UpdateAssetStatusRequest req, String actorEmail) {
        SaccoAsset asset = findOrThrow(id);

        if (asset.getStatus().isTerminal()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Asset is already " + asset.getStatus() + " and cannot be updated further.");
        }

        if (req.newStatus().isTerminal() &&
                (req.disposalNotes() == null || req.disposalNotes().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Disposal notes are required when marking an asset as " + req.newStatus() + ".");
        }

        AssetStatus previousStatus = asset.getStatus();
        asset.setStatus(req.newStatus());
        asset.setDisposalNotes(req.disposalNotes());
        if (req.newStatus().isTerminal()) {
            asset.setDisposedAt(ZonedDateTime.now());
        }

        SaccoAsset saved = assetRepository.save(asset);

        securityAuditService.logEvent(
                "ASSET_STATUS_CHANGED",
                "ASSET-" + saved.getId(),
                String.format("Asset status changed by %s: %s [%s] %s → %s%s",
                        actorEmail, saved.getAssetName(), saved.getId(),
                        previousStatus, req.newStatus(),
                        req.disposalNotes() != null ? " | Notes: " + req.disposalNotes() : "")
        );

        log.info("SAC-221: Asset {} status {} → {} by {}", id, previousStatus, req.newStatus(), actorEmail);
        return toResponse(saved);
    }

    /** Returns all assets ordered by registration date descending. */
    @Transactional(readOnly = true)
    public List<AssetResponse> listAll() {
        return assetRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).toList();
    }

    /** Returns assets filtered by status, ordered by registration date descending. */
    @Transactional(readOnly = true)
    public List<AssetResponse> listByStatus(AssetStatus status) {
        return assetRepository.findByStatusOrderByCreatedAtDesc(status)
                .stream().map(this::toResponse).toList();
    }

    /** Returns a single asset by ID. */
    @Transactional(readOnly = true)
    public AssetResponse getById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private SaccoAsset findOrThrow(UUID id) {
        return assetRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Asset not found: " + id));
    }

    private UUID resolveUserId(String email) {
        return userRepository.findByEmail(email)
                .map(u -> u.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found in the database."));
    }

    private AssetResponse toResponse(SaccoAsset a) {
        return new AssetResponse(
                a.getId(), a.getAssetName(), a.getCategory(), a.getStatus(),
                a.getSerialNumber(), a.getDescription(), a.getPurchaseDate(),
                a.getPurchaseCost(), a.getGlAccountCode(), a.getJournalReference(),
                a.getLocation(), a.getSupplier(), a.getWarrantyExpiry(),
                a.getDisposedAt(), a.getDisposalNotes(), a.getCreatedByUserId(),
                a.getCreatedAt(), a.getUpdatedAt()
        );
    }
}
