package com.jaytechwave.sacco.modules.loans.api.controller;

import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.LoanProductRequest;
import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.LoanProductResponse;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanProductService;
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
@RequestMapping("/api/v1/loans/products")
@RequiredArgsConstructor
@Tag(name = "Loans", description = "Loan applications, approval workflow, disbursement")
public class LoanProductController {

    private final LoanProductService loanProductService;

    @Operation(summary = "Create loan product", description = "Define a new loan product (term, interest, fees). Requires SYSTEM_ADMIN.")
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<LoanProductResponse> createProduct(@Valid @RequestBody LoanProductRequest request) {
        return ResponseEntity.ok(loanProductService.createLoanProduct(request));
    }

    @Operation(summary = "Update loan product")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<LoanProductResponse> updateProduct(
            @PathVariable UUID id,
            @Valid @RequestBody LoanProductRequest request) {
        return ResponseEntity.ok(loanProductService.updateLoanProduct(id, request));
    }

    @Operation(summary = "List loan products")
    @GetMapping
    @PreAuthorize("isAuthenticated()") // Anyone can view products
    public ResponseEntity<List<LoanProductResponse>> getProducts(
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(loanProductService.getAllLoanProducts(activeOnly));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<LoanProductResponse> getProduct(@PathVariable UUID id) {
        return ResponseEntity.ok(loanProductService.getLoanProduct(id));
    }
}