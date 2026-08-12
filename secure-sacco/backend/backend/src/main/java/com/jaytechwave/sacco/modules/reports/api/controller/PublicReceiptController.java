package com.jaytechwave.sacco.modules.reports.api.controller;

import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.PaymentRouteLookupResponse;
import com.jaytechwave.sacco.modules.paymentproducts.domain.service.PaymentLookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public/receipts")
@RequiredArgsConstructor
public class PublicReceiptController {

    private final PaymentLookupService paymentLookupService;

    @GetMapping("/{reference}")
    public ResponseEntity<PaymentRouteLookupResponse> getReceipt(@PathVariable String reference) {
        return paymentLookupService.lookupByReference(reference)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
