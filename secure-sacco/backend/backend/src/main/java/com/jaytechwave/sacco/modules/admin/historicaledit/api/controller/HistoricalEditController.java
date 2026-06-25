package com.jaytechwave.sacco.modules.admin.historicaledit.api.controller;

import com.jaytechwave.sacco.modules.admin.historicaledit.api.dto.HistoricalEditDTOs.*;
import com.jaytechwave.sacco.modules.admin.historicaledit.domain.service.HistoricalTransactionEditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * SAC-269: TEMPORARY endpoint, see V92 migration + HistoricalEditDTOs
 * package-level comment. Delete this controller (and the whole
 * com.jaytechwave.sacco.modules.admin.historicaledit package) before go-live.
 */
@RestController
@RequestMapping("/api/v1/admin/historical-edit")
@RequiredArgsConstructor
@Tag(name = "Historical Data Edit (TEMPORARY)", description = "Migration verification only — remove before go-live")
public class HistoricalEditController {

    private final HistoricalTransactionEditService editService;

    @Operation(summary = "List a member's savings transactions in a date range, for correction")
    @GetMapping("/savings")
    @PreAuthorize("hasAuthority('HISTORICAL_DATA_EDIT')")
    public ResponseEntity<List<HistoricalTransactionItem>> search(
            @RequestParam UUID memberId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return ResponseEntity.ok(editService.search(new SearchRequest(memberId, from, to)));
    }

    @Operation(summary = "Edit a specific historical savings transaction (amount/date/reference) and its linked GL entry")
    @PostMapping("/savings/edit")
    @PreAuthorize("hasAuthority('HISTORICAL_DATA_EDIT')")
    public ResponseEntity<EditTransactionResponse> edit(
            @Valid @RequestBody EditTransactionRequest request, Authentication authentication) {
        return ResponseEntity.ok(editService.editTransaction(request, authentication.getName()));
    }
}