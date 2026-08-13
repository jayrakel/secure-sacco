package com.jaytechwave.sacco.modules.accounting.api.controller;

import com.jaytechwave.sacco.modules.accounting.api.dto.CreateFinancialYearRequest;
import com.jaytechwave.sacco.modules.accounting.api.dto.FinancialYearResponse;
import com.jaytechwave.sacco.modules.accounting.domain.service.FinancialYearService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounting/financial-years")
@RequiredArgsConstructor
@Tag(name = "Financial Year Management", description = "Endpoints for managing financial years")
public class FinancialYearController {

    private final FinancialYearService financialYearService;

    @Operation(summary = "Get all financial years")
    @GetMapping
    @PreAuthorize("hasAuthority('ACCOUNTING_READ')")
    public ResponseEntity<List<FinancialYearResponse>> getAll() {
        return ResponseEntity.ok(financialYearService.getAllFinancialYears());
    }

    @Operation(summary = "Create a new financial year")
    @PostMapping
    @PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")
    public ResponseEntity<FinancialYearResponse> create(@Valid @RequestBody CreateFinancialYearRequest request) {
        return ResponseEntity.ok(financialYearService.createFinancialYear(request));
    }

    @Operation(summary = "Close a financial year")
    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")
    public ResponseEntity<FinancialYearResponse> closeYear(@PathVariable UUID id) {
        return ResponseEntity.ok(financialYearService.closeFinancialYear(id));
    }

    @Operation(summary = "Set a financial year as current")
    @PostMapping("/{id}/current")
    @PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")
    public ResponseEntity<FinancialYearResponse> setCurrent(@PathVariable UUID id) {
        return ResponseEntity.ok(financialYearService.setCurrentFinancialYear(id));
    }
}
