package com.jaytechwave.sacco.modules.paymentproducts.api.controller;

import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.service.PaymentProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payment-products")
@RequiredArgsConstructor
@Tag(name = "Payment Products", description = "Admin-configurable payable categories (Savings, Penalty, Loan, custom)")
public class PaymentProductController {

    private final PaymentProductService productService;

    @Operation(summary = "List all payment products (admin)")
    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public ResponseEntity<List<ProductResponse>> getAll() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @Operation(summary = "List active payment products (used by member deposit flow)")
    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ProductResponse>> getActive() {
        return ResponseEntity.ok(productService.getActiveProducts());
    }

    @Operation(summary = "Create a new payment product")
    @PostMapping
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(request));
    }

    @Operation(summary = "Update a payment product")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public ResponseEntity<ProductResponse> update(@PathVariable UUID id, @RequestBody UpdateProductRequest request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @Operation(summary = "Delete a custom payment product (system products cannot be deleted)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}