package com.jaytechwave.sacco.modules.payments.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.*;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopConnectService;
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

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Co-op Connect M-Pesa STK push and callback handling")
public class CoopConnectController {

    private final PaymentService      paymentService;
    private final ObjectMapper        objectMapper;
    private final UserRepository      userRepository;
    private final CoopConnectService  coopConnectService;

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
    @RequestMapping(value = "/coop/stk-callback", method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<IpnAckResponse> handleStkCallback(@RequestBody(required = false) String rawBody) {
        log.info("Co-op STK Callback received: {}", rawBody);
        if (rawBody == null || rawBody.isBlank()) return ResponseEntity.ok(IpnAckResponse.ok());
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
    @RequestMapping(value = "/coop/ipn", method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<IpnAckResponse> handleCoopIpn(@RequestBody(required = false) String rawBody) {
        log.info("Co-op IPN received: {}", rawBody);
        if (rawBody == null || rawBody.isBlank()) return ResponseEntity.ok(IpnAckResponse.ok());
        try {
            CoopIpnPayload payload = objectMapper.readValue(rawBody, CoopIpnPayload.class);
            paymentService.processCoopIpn(rawBody, payload);
            return ResponseEntity.ok(IpnAckResponse.ok());
        } catch (Exception e) {
            log.error("Failed to process Co-op IPN: {}", e.getMessage(), e);
            return ResponseEntity.ok(IpnAckResponse.error(e.getMessage()));
        }
    }

    // ── Real-time account balance ─────────────────────────────────────────────

    @Operation(summary = "Get Co-op bank account balance",
            description = "Returns the real-time balance of the SACCO Co-op account. Cached for 5 minutes.")
    @GetMapping("/coop/account-balance")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON','LOAN_OFFICER')")
    public ResponseEntity<?> getAccountBalance() {
        try {
            var balance = coopConnectService.getAccountBalance();
            if (balance == null) {
                return ResponseEntity.status(503)
                        .body(Map.of("error", "Could not fetch account balance from Co-op Bank"));
            }
            return ResponseEntity.ok(Map.of(
                    "availableBalance", balance.getAvailableBalance() != null ? balance.getAvailableBalance() : "0",
                    "bookedBalance",    balance.getBookedBalance()    != null ? balance.getBookedBalance()    : "0",
                    "currency",         balance.getCurrency()         != null ? balance.getCurrency()         : "KES",
                    "accountNumber",    balance.getAccountNumber()    != null ? balance.getAccountNumber()    : "",
                    "messageCode",      balance.getMessageCode()      != null ? balance.getMessageCode()      : ""
            ));
        } catch (Exception e) {
            log.error("Failed to get account balance: {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", "Account balance unavailable"));
        }
    }

    // ── Mini statement ────────────────────────────────────────────────────────

    @Operation(summary = "Get Co-op bank mini statement",
            description = "Returns the last 10 transactions on the SACCO Co-op account.")
    @GetMapping("/coop/mini-statement")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON')")
    public ResponseEntity<?> getMiniStatement() {
        try {
            var statement = coopConnectService.getMiniStatement();
            if (statement == null) {
                return ResponseEntity.status(503)
                        .body(Map.of("error", "Could not fetch mini-statement from Co-op Bank"));
            }
            return ResponseEntity.ok(statement);
        } catch (Exception e) {
            log.error("Failed to get mini-statement: {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Account transaction inquiry ───────────────────────────────────────────

    @Operation(summary = "Get Co-op account transactions for a date range",
            description = "Returns all transactions for the SACCO account between fromDate and toDate (YYYY-MM-DD).")
    @GetMapping("/coop/transactions")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON')")
    public ResponseEntity<?> getAccountTransactions(
            @RequestParam String fromDate,
            @RequestParam String toDate) {
        try {
            var transactions = coopConnectService.getAccountTransactions(fromDate, toDate);
            if (transactions == null) {
                return ResponseEntity.status(503)
                        .body(Map.of("error", "Could not fetch transactions from Co-op Bank"));
            }
            return ResponseEntity.ok(transactions);
        } catch (Exception e) {
            log.error("Failed to get account transactions: {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Transaction status enquiry ────────────────────────────────────────────

    @Operation(summary = "Check Co-op STK push transaction status",
            description = "Check whether a specific M-Pesa STK push was completed, by its MessageReference.")
    @GetMapping("/coop/transaction-status/{messageReference}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','TREASURER','CASHIER','DEPUTY_CASHIER')")
    public ResponseEntity<?> getTransactionStatus(
            @PathVariable String messageReference) {
        try {
            var status = coopConnectService.checkTransactionStatus(messageReference);
            if (status == null) {
                return ResponseEntity.status(503)
                        .body(Map.of("error", "Could not retrieve transaction status"));
            }
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("Failed to get transaction status for ref={}: {}", messageReference, e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }
}