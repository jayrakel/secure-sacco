package com.jaytechwave.sacco.modules.accounting.api.controller;

import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.*;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.core.api.PageSizeValidator;
import com.jaytechwave.sacco.modules.core.api.dto.PagedResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/accounting/journals")
@RequiredArgsConstructor
public class JournalEntryController {

    private final JournalEntryService journalEntryService;

    /** Post a manual journal entry. Requires ACCOUNTING_JOURNAL_POST. */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ACCOUNTING_JOURNAL_POST', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<JournalEntryResponse> createManualJournalEntry(
            @Valid @RequestBody CreateJournalEntryRequest request) {
        return ResponseEntity.ok(journalEntryService.postEntry(request));
    }

    /** List all journal entries. Requires ACCOUNTING_READ. */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ACCOUNTING_READ', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<PagedResponse<JournalEntryResponse>> getAllJournalEntries(
            @PageableDefault(size = 20, sort = "transactionDate", direction = Sort.Direction.DESC) Pageable pageable) {
        PageSizeValidator.validated(pageable);
        return ResponseEntity.ok(PagedResponse.from(journalEntryService.getAllJournalEntries(pageable)));
    }
}