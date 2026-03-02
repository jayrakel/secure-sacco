package com.jaytechwave.sacco.modules.accounting.api.controller;

import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.*;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/accounting/journals")
@RequiredArgsConstructor
public class JournalEntryController {

    private final JournalEntryService journalEntryService;

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')") // Limit to Admin/Accountant roles
    public ResponseEntity<JournalEntryResponse> createManualJournalEntry(@Valid @RequestBody CreateJournalEntryRequest request) {
        JournalEntryResponse response = journalEntryService.postEntry(request);
        return ResponseEntity.ok(response);
    }
}