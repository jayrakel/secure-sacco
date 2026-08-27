package com.jaytechwave.sacco.modules.payments.api;

import com.jaytechwave.sacco.modules.payments.domain.service.JengaCallbackService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments/jenga")
@RequiredArgsConstructor
public class JengaCallbackController {

    private final JengaCallbackService jengaCallbackService;

    @PostMapping("/ipn")
    public ResponseEntity<String> handleJengaIpn(@RequestBody Map<String, Object> payload,
                                                 @RequestHeader Map<String, String> headers) {
        log.info("Received Jenga IPN webhook: {}", payload);
        log.debug("Jenga IPN headers: {}", headers);

        // TODO: In a production system, verify the Jenga Signature here using JengaSecurityUtils

        try {
            // Extract standard fields based on Jenga documentation
            // Structure varies by API version, assuming standard EazzyPay/IPN format
            Map<String, Object> transaction = (Map<String, Object>) payload.get("transaction");
            if (transaction == null) {
                // Fallback for different payload structures
                transaction = payload; 
            }
            
            String reference = (String) transaction.get("reference");
            String billNumber = (String) transaction.get("billNumber"); // E.g., 12345#SAV4000LN1000
            
            Object amountObj = transaction.get("amount");
            BigDecimal amount = new BigDecimal(String.valueOf(amountObj));
            
            String senderPhone = (String) transaction.get("mobileNumber");
            String senderName = (String) transaction.get("customerName");

            jengaCallbackService.processIpn(reference, billNumber, amount, senderPhone, senderName);

            return ResponseEntity.ok("Success");
        } catch (Exception e) {
            log.error("Error processing Jenga IPN", e);
            // Return 200 anyway so Jenga doesn't retry indefinitely for bad data
            return ResponseEntity.ok("Processed with errors");
        }
    }
}
