package com.jaytechwave.sacco.modules.core.notifications;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Handles incoming webhooks (callbacks) from Africa's Talking.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/callbacks/africastalking")
public class AfricasTalkingCallbackController {

    /**
     * URL for Delivery Reports: POST /api/v1/callbacks/africastalking/sms/delivery
     */
    @PostMapping(value = "/sms/delivery", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> handleSmsDeliveryReport(@RequestParam Map<String, String> payload) {
        log.info("Received Africa's Talking SMS Delivery Report: {}", payload);

        // Example of fields received:
        // String status = payload.get("status");
        // String messageId = payload.get("id");
        // String phoneNumber = payload.get("phoneNumber");
        // String networkCode = payload.get("networkCode");
        // String failureReason = payload.get("failureReason");

        // Return 200 OK so AT knows the callback was received successfully
        return ResponseEntity.ok("Success");
    }

    /**
     * URL for Incoming Messages: POST /api/v1/callbacks/africastalking/sms/incoming
     */
    @PostMapping(value = "/sms/incoming", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> handleIncomingSms(@RequestParam Map<String, String> payload) {
        log.info("Received Africa's Talking Incoming SMS: {}", payload);

        // Example of fields received:
        // String from = payload.get("from");
        // String to = payload.get("to");
        // String text = payload.get("text");
        // String date = payload.get("date");
        // String id = payload.get("id");
        // String linkId = payload.get("linkId");

        // Return 200 OK
        return ResponseEntity.ok("Success");
    }
}
