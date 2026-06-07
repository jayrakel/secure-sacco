package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.*;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransactionSource;
import com.jaytechwave.sacco.modules.payments.domain.repository.CoopTransactionRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Central cleanup and normalisation pipeline for all Co-op Bank events.
 *
 * <p>Every Co-op payload — IPN, STK callback, mini-statement transaction —
 * passes through here before touching any other part of the system.
 *
 * <p>Responsibilities:
 * <ol>
 *   <li>Extract the M-Pesa reference, phone, amount, dates from the raw payload</li>
 *   <li>Normalise the phone to E.164 format (254XXXXXXXXX)</li>
 *   <li>Resolve the phone → member using all possible hash formats</li>
 *   <li>Store a clean {@link CoopTransaction} record — idempotent (skips duplicates)</li>
 * </ol>
 *
 * <p>The frontend reads exclusively from {@link CoopTransactionRepository}.
 * No raw Co-op data ever reaches the UI.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CoopEventNormalizer {

    private final CoopTransactionRepository coopTransactionRepository;
    private final UserRepository            userRepository;
    private final MemberRepository          memberRepository;
    private final PiiSearchHashConverter    piiHashConverter;

    private static final DateTimeFormatter DT_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Normalise and store a Co-op B2B IPN event.
     * Returns the stored transaction, or empty if it was a duplicate.
     */
    @Transactional
    public Optional<CoopTransaction> normalizeIpn(CoopIpnPayload ipn, String rawJson) {
        boolean isCredit = "CREDIT".equalsIgnoreCase(ipn.getEventType());
        String  txId     = ipn.getTransactionId();
        if (txId == null || txId.isBlank()) txId = "IPN-" + UUID.randomUUID().toString().substring(0, 8);

        // IPN mpesaRef comes from the Narration first part
        String narration = ipn.getNarration() != null ? ipn.getNarration() : "";
        String[] parts   = narration.split("~");
        String mpesaRef  = parts.length > 0 ? parts[0].trim() : txId;

        if (coopTransactionRepository.existsByMpesaRef(mpesaRef)) {
            log.debug("CoopEventNormalizer: duplicate IPN mpesaRef={} — skipping", mpesaRef);
            return Optional.empty();
        }

        // Phone comes from CustMemoLine — try multiple fields
        String rawPhone = extractPhoneFromIpnMemo(
                ipn.getCustMemoLine1(), ipn.getCustMemoLine2(), ipn.getCustMemoLine3(), narration);
        String phone    = normalizePhone(rawPhone);

        // Account reference — last part of narration or CustMemoLine3
        String accountRef = extractAccountRef(ipn.getCustMemoLine3(), narration);

        BigDecimal amount = parseAmount(ipn.getAmount());

        CoopTransaction tx = CoopTransaction.builder()
                .mpesaRef(mpesaRef)
                .coopTransactionId(txId)  // Co-op's own CB... ID
                .source(CoopTransactionSource.IPN)
                .transactionType(isCredit ? "CR" : "DR")
                .amount(amount)
                .currency(ipn.getCurrency() != null ? ipn.getCurrency() : "KES")
                .runningBalance(ipn.getClearedBalance() != null
                        ? parseBigDecimal(ipn.getClearedBalance()) : null)
                .accountNumber(ipn.getAcctNo())
                .transactionDate(parseDateTime(ipn.getTransactionDate()))
                .valueDate(parseDateTime(ipn.getValueDate() != null ? ipn.getValueDate() : ipn.getPostingDate()))
                .senderPhone(phone)
                .rawNarration(narration)
                .accountReference(accountRef)
                .rawPayload(rawJson)
                .build();

        enrichWithMember(tx, phone);
        coopTransactionRepository.save(tx);
        log.info("CoopEventNormalizer: ✅ IPN stored — {} KES {} from {} ({})",
                tx.getTransactionType(), amount, tx.getSenderName() != null ? tx.getSenderName() : phone, mpesaRef);
        return Optional.of(tx);
    }

    /**
     * Normalise and store a Co-op STK push callback result.
     *
     * Co-op STK callback format (flat — no nested body):
     * {
     *   "MessageReference": "checkout-request-id",
     *   "MessageCode": "0",          // "0" = success
     *   "MessageDescription": "...",
     *   "Amount": "1000.0",
     *   "TransactionID": "UF5BY709I7",  // M-Pesa receipt
     *   "MobileNumber": "254717921562",
     *   "OperatorCode": "..."
     * }
     */
    @Transactional
    public Optional<CoopTransaction> normalizeStkCallback(StkCallbackPayload callback, String rawJson) {
        if (callback == null) return Optional.empty();

        // Only store successful STK pushes
        if (!"0".equals(callback.getMessageCode())) {
            log.debug("CoopEventNormalizer: STK callback messageCode={} — not success, skipping",
                    callback.getMessageCode());
            return Optional.empty();
        }

        // Use MessageReference as mpesaRef (checkout request ID — unique per push)
        String mpesaRef = callback.getMessageReference();
        if (mpesaRef == null || mpesaRef.isBlank()) return Optional.empty();

        if (coopTransactionRepository.existsByMpesaRef(mpesaRef)) {
            log.debug("CoopEventNormalizer: duplicate STK mpesaRef={} — skipping", mpesaRef);
            return Optional.empty();
        }

        String phone  = normalizePhone(callback.getMobileNumber());
        BigDecimal amount = parseAmount(callback.getAmount());
        String receiptId  = callback.getTransactionId(); // M-Pesa receipt e.g. UF5BY709I7

        CoopTransaction tx = CoopTransaction.builder()
                .mpesaRef(mpesaRef)
                .coopTransactionId(receiptId)
                .source(CoopTransactionSource.STK_CALLBACK)
                .transactionType("CR")
                .amount(amount)
                .currency("KES")
                .transactionDate(LocalDateTime.now())
                .valueDate(LocalDateTime.now())
                .senderPhone(phone)
                .rawNarration("STK:" + (receiptId != null ? receiptId : mpesaRef))
                .rawPayload(rawJson)
                .build();

        enrichWithMember(tx, phone);
        coopTransactionRepository.save(tx);
        log.info("CoopEventNormalizer: ✅ STK stored — CR KES {} from {} ref={}",
                amount, tx.getSenderName() != null ? tx.getSenderName() : phone, mpesaRef);
        return Optional.of(tx);
    }

    /**
     * Normalise and store a single mini-statement transaction entry.
     * Called by the polling job for each entry in the 10-transaction response.
     */
    @Transactional
    public Optional<CoopTransaction> normalizeMiniStatementEntry(TransactionEntry t,
                                                                 String accountNumber,
                                                                 String rawJson) {
        if (t.getTransactionId() == null) return Optional.empty();

        // Use TransactionReference as mpesaRef (most unique field Co-op gives us)
        String mpesaRef = t.getTransactionReference() != null
                ? t.getTransactionReference() : t.getTransactionId();

        if (coopTransactionRepository.existsByMpesaRef(mpesaRef)) {
            log.debug("CoopEventNormalizer: duplicate mini-statement mpesaRef={} — skipping", mpesaRef);
            return Optional.empty();
        }

        boolean isCredit = "C".equalsIgnoreCase(t.getTransactionType());
        double credit  = t.getCreditAmount() != null ? t.getCreditAmount() : 0.0;
        double debit   = t.getDebitAmount()  != null ? t.getDebitAmount()  : 0.0;
        BigDecimal amount = BigDecimal.valueOf(isCredit ? credit : debit);

        // Parse narration: "REF~SACCO_NAME~SENDER_PHONE~..."
        String narration = t.getNarration() != null ? t.getNarration() : "";
        String[] parts   = narration.split("~");
        String phone     = null;
        String accountRef = null;

        if (parts.length >= 3) {
            // parts[0] = M-Pesa ref, parts[1] = SACCO name (skip), parts[2] = sender phone
            phone     = normalizePhone(parts[2].trim());
            accountRef = parts.length > 3 ? parts[3].trim() : null;
        } else if (parts.length == 2) {
            phone = normalizePhone(parts[1].trim());
        }

        CoopTransaction tx = CoopTransaction.builder()
                .mpesaRef(mpesaRef)
                .coopTransactionId(t.getTransactionId())  // Co-op's own CB... ID
                .source(CoopTransactionSource.MINI_STATEMENT)
                .transactionType(isCredit ? "CR" : "DR")
                .amount(amount)
                .currency("KES")
                .runningBalance(t.getRunningClearedBalance() != null
                        ? BigDecimal.valueOf(t.getRunningClearedBalance()) : null)
                .accountNumber(accountNumber)
                .transactionDate(parseDateTime(t.getTransactionDate()))
                .valueDate(parseDateTime(t.getValueDate()))
                .senderPhone(phone)
                .rawNarration(narration)
                .accountReference(accountRef)
                .rawPayload(rawJson)
                .build();

        enrichWithMember(tx, phone);
        coopTransactionRepository.save(tx);
        log.info("CoopEventNormalizer: ✅ Mini-stmt stored — {} KES {} from {} ({})",
                tx.getTransactionType(), amount,
                tx.getSenderName() != null ? tx.getSenderName() : (phone != null ? phone : "bank charge"),
                mpesaRef);
        return Optional.of(tx);
    }

    // ── Member resolution ──────────────────────────────────────────────────────

    /**
     * Enriches a transaction with member info by trying every possible phone format.
     * Sets senderName, memberId, and displayNarration on the transaction.
     *
     * <p>Two-tier lookup:
     * <ol>
     *   <li>Primary: {@code User.phoneNumberHash} WHERE {@code member_id IS NOT NULL}
     *       (the fast path — covers all members created via the normal registration flow).</li>
     *   <li>Fallback: {@code Member.phoneNumberHash} directly — catches cases where the
     *       User record exists but its {@code phone_number_hash} column was not populated
     *       (e.g. pre-V40 migrations, manual DB inserts, or historical data imports).</li>
     * </ol>
     */
    private void enrichWithMember(CoopTransaction tx, String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            // Bank charge or internal transfer — no phone
            tx.setDisplayNarration(tx.getRawNarration());
            return;
        }

        try {
            List<String> candidates = buildPhoneCandidates(rawPhone);
            for (String candidate : candidates) {
                String hash = piiHashConverter.convertToDatabaseColumn(candidate);

                // ── Tier 1: User table ────────────────────────────────────────
                // Skips orphan/duplicate user accounts that were never linked to a member.
                Optional<User> found = userRepository.findFirstByPhoneNumberHashAndMemberIdIsNotNull(hash);
                if (found.isPresent()) {
                    User user = found.get();
                    String name = user.getFirstName() + " " + user.getLastName();
                    tx.setSenderName(name);
                    tx.setMemberId(user.getMember().getId());
                    tx.setDisplayNarration(name);
                    log.info("CoopEventNormalizer: ✅ phone {} → member {} via User (format: {})",
                            rawPhone, name, candidate);
                    return;
                }

                // ── Tier 2: Member table fallback ─────────────────────────────
                // Handles cases where User.phone_number_hash was not populated but
                // Member.phone_number_hash is correct (historical data, manual imports).
                Optional<Member> foundMember = memberRepository.findByPhoneNumberHash(hash);
                if (foundMember.isPresent()) {
                    Member member = foundMember.get();
                    String name = member.getFirstName() + " " + member.getLastName();
                    tx.setSenderName(name);
                    tx.setMemberId(member.getId());
                    tx.setDisplayNarration(name);
                    log.info("CoopEventNormalizer: ✅ phone {} → member {} via Member fallback (format: {})",
                            rawPhone, name, candidate);
                    return;
                }
            }
            log.info("CoopEventNormalizer: ❌ no member found for phone {} (tried {} formats)",
                    rawPhone, candidates.size());
        } catch (Exception e) {
            log.warn("CoopEventNormalizer: member lookup failed for {}: {}", rawPhone, e.getMessage());
        }

        // Not a member — show phone as display narration
        tx.setDisplayNarration(rawPhone);
    }

    /**
     * Re-enriches all {@link CoopTransaction} records that have a phone number but
     * no matched member ({@code memberId IS NULL}).
     *
     * <p>This handles two real-world scenarios:
     * <ol>
     *   <li>A member's payment arrived before they were registered in the system.</li>
     *   <li>Phone format mismatch at original storage time prevented a match that would
     *       now succeed (e.g. member registered with "0717..." after payment arrived as "254717...").</li>
     * </ol>
     *
     * <p>Safe to call repeatedly — already-matched records are skipped by the repo query,
     * and the idempotency check in {@link #normalizeMiniStatementEntry} prevents double-storing.
     *
     * @return number of transactions that were newly matched to a member
     */
    @Transactional
    public int reEnrichAllUnmatched() {
        List<CoopTransaction> unmatched =
                coopTransactionRepository.findByMemberIdIsNullAndSenderPhoneIsNotNull();

        int matched = 0;
        for (CoopTransaction tx : unmatched) {
            enrichWithMember(tx, tx.getSenderPhone());
            if (tx.getMemberId() != null) {
                coopTransactionRepository.save(tx);
                matched++;
            }
        }

        log.info("CoopEventNormalizer: ♻️ Re-enrichment complete — {}/{} transactions matched.",
                matched, unmatched.size());
        return matched;
    }

    /**
     * Tries every Kenyan phone format so the hash lookup succeeds regardless
     * of how the number was stored at registration time.
     */
    private List<String> buildPhoneCandidates(String raw) {
        List<String> out = new ArrayList<>();
        if (raw == null || raw.isBlank()) return out;

        boolean hadPlus = raw.trim().startsWith("+");
        String digits   = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return out;

        String nine = null;
        if      (digits.startsWith("254") && digits.length() == 12) nine = digits.substring(3);
        else if ((digits.startsWith("07") || digits.startsWith("01")) && digits.length() == 10) nine = digits.substring(1);
        else if (digits.length() == 9) nine = digits;

        if (nine == null) {
            out.add(raw.trim());
            if (!raw.trim().equals(digits)) out.add(digits);
            return out;
        }

        // All formats — ordered by most-likely registration format first
        out.add("0" + nine);              // 0717921562  (local — most common at registration)
        out.add("254" + nine);            // 254717921562 (E.164 without +)
        out.add("+254" + nine);           // +254717921562 (E.164 with +)
        out.add(nine);                    // 717921562 (trunk stripped)

        if (hadPlus && !out.contains(raw.trim())) out.add(raw.trim());
        return out;
    }

    // ── Extraction helpers ─────────────────────────────────────────────────────

    private String extractPhoneFromIpnMemo(String line1, String line2, String line3, String narration) {
        // IPN CustMemoLine1 format: "UF5BY709I7~BETTER LINK VE"  (truncated)
        // CustMemoLine2 format: "NTURES SACCO~254717921562"
        // Narration format: "UF5BY709I7~BETTER LINK VENTURES SACCO~254717921562~AccountRef..."

        // Try narration first (most complete)
        if (narration != null && !narration.isBlank()) {
            String[] parts = narration.split("~");
            if (parts.length >= 3) {
                String candidate = parts[2].trim();
                if (candidate.matches("[0-9+]{9,15}")) return candidate;
            }
        }
        // Try CustMemoLine2 (often contains the phone when line1 is truncated)
        if (line2 != null && !line2.isBlank()) {
            String[] parts = line2.split("~");
            for (String part : parts) {
                if (part.trim().matches("[0-9+]{9,15}")) return part.trim();
            }
        }
        // Try CustMemoLine1
        if (line1 != null && !line1.isBlank()) {
            String[] parts = line1.split("~");
            for (String part : parts) {
                if (part.trim().matches("[0-9+]{9,15}")) return part.trim();
            }
        }
        return null;
    }

    private String extractAccountRef(String custMemoLine3, String narration) {
        // AccountRef is usually in narration parts[3] or CustMemoLine3
        if (narration != null) {
            String[] parts = narration.split("~");
            if (parts.length >= 4) return parts[3].trim();
        }
        if (custMemoLine3 != null && !custMemoLine3.isBlank()) {
            // CustMemoLine3: "~AccountRef0d7fee8abc5f4ecc819" (first char is ~)
            return custMemoLine3.replaceAll("^~+", "").trim();
        }
        return null;
    }

    // ── Parsing helpers ────────────────────────────────────────────────────────

    private String normalizePhone(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return null;
        if (digits.startsWith("07") || digits.startsWith("01")) return "254" + digits.substring(1);
        if (digits.startsWith("7")  || digits.startsWith("1"))  return "254" + digits;
        if (digits.startsWith("254") && digits.length() == 12)  return digits;
        return digits.length() >= 9 ? digits : null;
    }

    private BigDecimal parseAmount(String raw) {
        if (raw == null || raw.isBlank()) return BigDecimal.ZERO;
        try { return new BigDecimal(raw.replaceAll("[^0-9.]", "")); }
        catch (NumberFormatException e) { return BigDecimal.ZERO; }
    }

    private BigDecimal parseBigDecimal(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try { return new BigDecimal(raw.replaceAll("[^0-9.]", "")); }
        catch (NumberFormatException e) { return null; }
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String s = raw.length() > 19 ? raw.substring(0, 19) : raw;
            return LocalDateTime.parse(s, DT_FMT);
        } catch (DateTimeParseException e) { return null; }
    }
}