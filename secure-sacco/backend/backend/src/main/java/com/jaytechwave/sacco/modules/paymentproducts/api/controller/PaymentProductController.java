package com.jaytechwave.sacco.modules.paymentproducts.api.controller;

import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.service.PaymentProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
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

    @Operation(summary = "SAC-263: paginated transaction history for a product — the 'smart tab', works for any product automatically")
    @GetMapping("/{id}/transactions")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public ResponseEntity<ProductTransactionPage> getTransactions(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(productService.getProductTransactions(id, pageable));
    }

    @Operation(summary = "SAC-263: downloadable standalone statement (CSV) for a single product's full history")
    @GetMapping("/{id}/statement")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public ResponseEntity<byte[]> downloadStatement(@PathVariable UUID id) {
        List<ProductTransactionItem> items = productService.getProductTransactionsForExport(id);
        String productName = productService.getAllProducts().stream()
                .filter(p -> p.id().equals(id))
                .findFirst()
                .map(ProductResponse::name)
                .orElse("product");

        StringBuilder csv = new StringBuilder();
        csv.append("Date,Member Number,Member Name,Amount (KES),Status,Reference\n");
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        for (ProductTransactionItem item : items) {
            csv.append(escapeCsv(item.createdAt() != null ? item.createdAt().format(fmt) : ""))
               .append(',').append(escapeCsv(item.memberNumber()))
               .append(',').append(escapeCsv(item.memberName()))
               .append(',').append(item.amount())
               .append(',').append(escapeCsv(item.status()))
               .append(',').append(escapeCsv(item.reference()))
               .append('\n');
        }

        byte[] body = csv.toString().getBytes(StandardCharsets.UTF_8);
        String filename = productName.replaceAll("[^a-zA-Z0-9]+", "_") + "_statement.csv";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(body);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}