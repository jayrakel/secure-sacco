package com.jaytechwave.sacco.modules.payments.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.*;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction;
import com.jaytechwave.sacco.modules.payments.domain.repository.CoopTransactionRepository;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopConnectService;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
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
    private final PaymentRepository   paymentRepository;
    private final CoopTransactionRepository coopTransactionRepository;
    private final com.jaytechwave.sacco.modules.payments.domain.service.CoopEventNormalizer coopEventNormalizer;
    private final com.jaytechwave.sacco.modules.savings.domain.service.SavingsService savingsService;

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

    // ── Account balance enquiry ───────────────────────────────────────────────

    @Operation(summary = "Get Co-op Account Balance",
            description = "Fetches the real-time balance of the Sacco's Co-op Connect account.")
    @GetMapping("/coop/balance")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON','LOAN_OFFICER') or hasAuthority('BANKING_READ')")
    public ResponseEntity<?> getAccountBalance() {
        try {
            var balance = coopConnectService.getAccountBalance();
            if (balance == null) {
                return ResponseEntity.status(503)
                        .body(Map.of("error", "Received empty response from Co-op Bank"));
            }
            return ResponseEntity.ok(balance);
        } catch (Exception e) {
            log.error("Failed to get Co-op account balance: {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", "Bank API Error: " + e.getMessage()));
        }
    }

    // ── Mini statement ────────────────────────────────────────────────────────

    @Operation(summary = "Get Co-op bank mini statement",
            description = "Returns the last 10 transactions on the SACCO Co-op account (camelCase normalised for frontend).")
    @GetMapping("/coop/mini-statement")
    @PreAuthorize("hasAuthority('BANKING_READ')")
    public ResponseEntity<?> getMiniStatement() {
        try {
            var statement = coopConnectService.getMiniStatement();
            if (statement == null) {
                return ResponseEntity.status(503)
                        .body(Map.of("error", "Could not fetch mini-statement from Co-op Bank"));
            }
            if (!"0".equals(statement.getMessageCode())) {
                return ResponseEntity.status(503).body(Map.of(
                        "error", statement.getMessageDescription() != null
                                ? statement.getMessageDescription()
                                : "Co-op returned an error: " + statement.getMessageCode()
                ));
            }

            // Normalise to camelCase and fix field names to match actual Co-op response
            var transactions = statement.getTransactions() == null
                    ? List.of()
                    : statement.getTransactions().stream().map(t -> {
                Map<String, Object> tx = new LinkedHashMap<>();

                // Co-op sends "C"/"D" — normalise to "CR"/"DR" for frontend
                boolean isCredit = "C".equalsIgnoreCase(t.getTransactionType());
                double amount = isCredit
                        ? (t.getCreditAmount() != null ? t.getCreditAmount() : 0.0)
                        : (t.getDebitAmount()  != null ? t.getDebitAmount()  : 0.0);

                // Narration format: "REF~SACCO_NAME~SENDER_PHONE~..."
                // parts[0] = M-Pesa ref, parts[1] = SACCO name (destination, skip),
                // parts[2] = sender phone
                String narration = t.getNarration() != null ? t.getNarration() : "";
                String[] parts   = narration.split("~");
                String mpesaRef  = null;
                String phone     = null;

                if (parts.length >= 3) {
                    mpesaRef = parts[0].trim();
                    // parts[1] is the SACCO's own name — NOT the sender, skip it
                    phone    = normalizePhone(parts[2].trim());
                } else if (parts.length == 2) {
                    mpesaRef = parts[0].trim();
                    phone    = normalizePhone(parts[1].trim());
                }

                // Resolve phone → member name via service (handles hashing + DB lookup)
                String senderName = coopConnectService.resolvePhoneToMemberName(phone);

                // Display: member name → phone fallback → raw narration (bank charges)
                String display = senderName != null ? senderName
                        : (phone != null ? phone : narration);

                tx.put("transactionId",   t.getTransactionId());
                tx.put("transactionDate", t.getTransactionDate());
                tx.put("valueDate",        t.getValueDate());
                tx.put("narration",        display);
                tx.put("rawNarration",     narration);
                tx.put("transactionType",  isCredit ? "CR" : "DR");
                tx.put("amount",           String.format("%.2f", amount));
                tx.put("runningBalance",   t.getRunningClearedBalance() != null
                                           ? String.format("%.2f", t.getRunningClearedBalance()) : null);
                tx.put("reference",        mpesaRef != null ? mpesaRef : t.getTransactionReference());
                tx.put("senderPhone",      phone);
                tx.put("senderName",       senderName);
                tx.put("isMember",         senderName != null);
                return tx;
            }).toList();

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("messageCode",        statement.getMessageCode());
            response.put("messageDescription", statement.getMessageDescription());
            response.put("accountNumber",      statement.getAccountNumber());
            response.put("accountName",        statement.getAccountName());
            response.put("currency",           statement.getCurrency());
            response.put("transactions",       transactions);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get mini-statement: {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Account transaction history (IPN-sourced, stored in our DB) ─────────

    @Operation(summary = "Get SACCO Co-op account transactions (IPN-sourced)",
            description = "Returns completed payments received via Co-op B2B IPN stored in our database. " +
                    "Co-op replays historical transactions through the IPN endpoint.")
    @GetMapping("/coop/transactions")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON')")
    public ResponseEntity<?> getAccountTransactions(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {
        try {
            Page<Payment> payments;

            if (fromDate != null && toDate != null) {
                ZonedDateTime from = ZonedDateTime.parse(fromDate + "T00:00:00+03:00[Africa/Nairobi]");
                ZonedDateTime to   = ZonedDateTime.parse(toDate   + "T23:59:59+03:00[Africa/Nairobi]");
                payments = paymentRepository.findCompletedBetween(from, to, PageRequest.of(page, size));
            } else {
                payments = paymentRepository.findByStatusOrderByCreatedAtDesc(
                        PaymentStatus.COMPLETED, PageRequest.of(page, size));
            }

            List<Map<String, Object>> transactions = payments.getContent().stream().map(p -> {
                Map<String, Object> tx = new LinkedHashMap<>();
                tx.put("transactionId",   p.getTransactionRef());
                tx.put("transactionDate", p.getCreatedAt() != null
                        ? p.getCreatedAt().toLocalDate().toString() : null);
                tx.put("amount",          p.getAmount());
                tx.put("currency",        p.getCurrency());
                tx.put("narration",       p.getAccountReference());
                tx.put("transactionType", p.getTransactionType() != null ? p.getTransactionType() : "CR");
                tx.put("senderName",      p.getSenderName());
                tx.put("senderPhone",     p.getSenderPhoneNumber());
                tx.put("paymentMethod",   p.getPaymentMethod());
                tx.put("paymentRef",      p.getInternalRef());
                return tx;
            }).toList();

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("messageCode",        "0");
            response.put("messageDescription", "SUCCESS");
            response.put("source",             "IPN_DATABASE");
            response.put("totalElements",      payments.getTotalElements());
            response.put("totalPages",         payments.getTotalPages());
            response.put("currentPage",        page);
            response.put("transactions",       transactions);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get account transactions from DB: {}", e.getMessage());
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

    // ── Normalised Co-op feed from DB ─────────────────────────────────────────

    @Operation(summary = "Normalised Co-op transaction feed (DB-sourced)")
    @GetMapping("/coop/feed")
    @PreAuthorize("hasAuthority('BANKING_READ')")
    public ResponseEntity<?> getCoopFeed(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            var pageable = org.springframework.data.domain.PageRequest.of(page, size);
            var txns = coopTransactionRepository.findFeedDeduped(pageable);

            var items = txns.getContent().stream()
                    // Final sort: latest first, falling back to createdAt for null valueDates
                    .sorted(java.util.Comparator.comparing(
                            (CoopTransaction t) -> t.getValueDate() != null
                                    ? t.getValueDate()
                                    : t.getCreatedAt(),
                            java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())
                    ))
                    .map(t -> {
                Map<String, Object> tx = new LinkedHashMap<>();
                tx.put("id",               t.getId());
                tx.put("mpesaRef",         t.getMpesaRef());
                tx.put("source",           t.getSource().name());
                tx.put("transactionType",  t.getTransactionType());
                tx.put("amount",           t.getAmount());
                tx.put("runningBalance",   t.getRunningBalance());
                tx.put("currency",         t.getCurrency());
                tx.put("valueDate",        t.getValueDate());
                tx.put("senderPhone",      t.getSenderPhone());
                tx.put("senderName",       t.getSenderName());
                tx.put("isMember",         t.getSenderName() != null);
                tx.put("displayNarration", t.getDisplayNarration());
                tx.put("accountReference", t.getAccountReference());
                tx.put("savingsCredited",  t.isSavingsCredited());
                return tx;
            }).toList();

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("transactions",  items);
            response.put("totalElements", txns.getTotalElements());
            response.put("totalPages",    txns.getTotalPages());
            response.put("currentPage",   page);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("getCoopFeed failed: {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }
    // ── Re-enrich unmatched transactions ─────────────────────────────────────

    /**
     * Scans all stored Co-op transactions that have a phone number but no matched member,
     * and attempts to link them to a member using the current phone-hash lookup.
     *
     * <p>Call this when:
     * <ul>
     *   <li>New members are registered whose past payments are already stored.</li>
     *   <li>Phone format issues previously prevented a match.</li>
     *   <li>After a batch data import that added new member phone numbers.</li>
     * </ul>
     */
    @Operation(summary = "Re-enrich unmatched Co-op transactions + credit savings",
            description = "Retroactively matches stored transactions to members, then credits savings " +
                    "and posts GL entries for any matched CREDIT transactions not yet processed. " +
                    "Safe to call multiple times — idempotent on mpesaRef.")
    @PostMapping("/coop/re-enrich")
    @PreAuthorize("hasAuthority('BANKING_READ')")
    public ResponseEntity<?> reEnrichUnmatched() {
        try {
            // Phase 1 — link unmatched CoopTransactions to members via phone hash lookup
            int matched = coopEventNormalizer.reEnrichAllUnmatched();

            // Phase 2a — STK payments: mark savings_credited = true WITHOUT calling
            // processMpesaPaybillDeposit. Their savings were already posted by
            // SavingsPaymentListener via the DEP- route when the STK was confirmed.
            // Skipping this caused the June 2026 production double-credit incident where
            // calling processMpesaPaybillDeposit on STK CoopTransactions doubled savings.
            java.util.List<com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction> allUncredited =
                    coopTransactionRepository.findBySavingsCreditedFalseAndTransactionTypeAndMemberIdIsNotNull("CR");

            int stkAcknowledged = 0;
            for (com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction tx : allUncredited) {
                boolean isStkPayment = paymentRepository.existsByMpesaRefAndPaymentTypeAndStatus(
                        tx.getMpesaRef(), "STK_PUSH",
                        com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus.COMPLETED);
                if (isStkPayment) {
                    tx.setSavingsCredited(true);
                    tx.setSavingsCreditedAt(java.time.LocalDateTime.now());
                    coopTransactionRepository.save(tx);
                    stkAcknowledged++;
                    log.info("Re-enrich: 🔒 STK acknowledged (already credited via DEP- path) ref={}", tx.getMpesaRef());
                }
            }

            // Phase 2b — genuine paybill deposits only: CoopTransactions with no matching
            // STK_PUSH payment. These are actual paybill payments that were never credited.
            java.util.List<com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction> toCreditSavings =
                    coopTransactionRepository.findUncreditedNonStkCredits();

            int credited = 0;
            for (com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction tx : toCreditSavings) {
                try {
                    java.time.LocalDateTime valueDate =
                            tx.getValueDate() != null ? tx.getValueDate() : tx.getCreatedAt();

                    savingsService.processMpesaPaybillDeposit(
                            tx.getMemberId(), tx.getAmount(), tx.getMpesaRef(), tx.getSenderPhone(), valueDate);

                    tx.setSavingsCredited(true);
                    tx.setSavingsCreditedAt(java.time.LocalDateTime.now());
                    coopTransactionRepository.save(tx);
                    credited++;
                    log.info("Re-enrich: ✅ Paybill savings credited — {} KES {} ref={}",
                            tx.getSenderName(), tx.getAmount(), tx.getMpesaRef());

                } catch (Exception e) {
                    log.error("Re-enrich: savings credit FAILED ref={} — {}", tx.getMpesaRef(), e.getMessage(), e);
                }
            }

            String msg = String.format(
                    "%d transaction(s) matched to members. %d paybill savings credited. %d STK savings acknowledged.",
                    matched, credited, stkAcknowledged);

            return ResponseEntity.ok(Map.of(
                    "message", msg,
                    "matched", matched,
                    "credited", credited,
                    "stkAcknowledged", stkAcknowledged));

        } catch (Exception e) {
            log.error("Re-enrichment failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Re-enrichment failed: " + e.getMessage()));
        }
    }

    private String normalizePhone(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return null;
        if (digits.startsWith("07") || digits.startsWith("01")) return "254" + digits.substring(1);
        if (digits.startsWith("7")  || digits.startsWith("1"))  return "254" + digits;
        if (digits.startsWith("254") && digits.length() == 12)  return digits;
        return digits;
    }
}