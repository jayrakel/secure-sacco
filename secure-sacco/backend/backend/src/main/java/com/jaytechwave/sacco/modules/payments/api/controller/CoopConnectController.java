package com.jaytechwave.sacco.modules.payments.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.*;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Co-op Connect M-Pesa STK push and callback handling")
public class CoopConnectController {

    private final PaymentService  paymentService;
    private final ObjectMapper    objectMapper;
    private final UserRepository  userRepository;

    // ── Member-facing: initiate STK push ─────────────────────────────────────

    @Operation(summary = "Initiate M-Pesa STK push via Co-op Connect",
            description = "Sends an M-Pesa STK prompt to the member's phone through Co-op Bank.")
    @PostMapping("/stk-push")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InitiateStkResponse> initiateStkPush(
            @Valid @RequestBody InitiateStkRequest request,
            Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UUID memberId = user.getMember() != null ? user.getMember().getId() : null;

        return ResponseEntity.ok(paymentService.initiateMpesaStkPush(request, memberId));
    }

    // ── Co-op callback: STK Push result ──────────────────────────────────────

    /**
     * Co-op Connect posts the STK push result here after the member enters their PIN.
     * Protected by IP whitelist ({@link com.jaytechwave.sacco.modules.payments.infrastructure.filter.MpesaIpWhitelistFilter}).
     * No authentication — Co-op does not send auth headers on callbacks.
     */
    @Operation(summary = "Co-op STK push callback (webhook)",
            description = "Called by Co-op Connect after member completes or cancels the STK prompt.")
    @PostMapping("/coop/stk-callback")
    public ResponseEntity<IpnAckResponse> handleStkCallback(@RequestBody String rawBody) {
        log.info("Co-op STK Callback received: {}", rawBody);
        try {
            StkCallbackPayload payload = objectMapper.readValue(rawBody, StkCallbackPayload.class);
            paymentService.processStkCallback(rawBody, payload);
            return ResponseEntity.ok(IpnAckResponse.ok());
        } catch (Exception e) {
            log.error("Failed to process Co-op STK Callback: {}", e.getMessage(), e);
            // Return 200 anyway so Co-op doesn't endlessly retry a broken payload
            return ResponseEntity.ok(IpnAckResponse.error(e.getMessage()));
        }
    }

    // ── Co-op IPN: B2B Core Banking notification ──────────────────────────────

    /**
     * Co-op Bank's Core Banking System posts here whenever money is credited
     * to the SACCO's account (e.g., member makes a manual M-Pesa paybill payment).
     * Protected by IP whitelist.
     * Must return {"MessageCode":"200","Message":"Successfully received data"} within 30s.
     */
    @Operation(summary = "Co-op B2B IPN (Core Banking notification)",
            description = "Called by Co-op CBS when a credit hits the SACCO's Co-op account.")
    @PostMapping("/coop/ipn")
    public ResponseEntity<IpnAckResponse> handleCoopIpn(@RequestBody String rawBody) {
        log.info("Co-op IPN received: {}", rawBody);
        try {
            CoopIpnPayload payload = objectMapper.readValue(rawBody, CoopIpnPayload.class);
            paymentService.processCoopIpn(rawBody, payload);
            return ResponseEntity.ok(IpnAckResponse.ok());
        } catch (Exception e) {
            log.error("Failed to process Co-op IPN: {}", e.getMessage(), e);
            return ResponseEntity.ok(IpnAckResponse.error(e.getMessage()));
        }
    }
}