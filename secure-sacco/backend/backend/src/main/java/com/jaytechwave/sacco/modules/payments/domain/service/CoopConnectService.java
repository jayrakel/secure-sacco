package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.core.util.SaccoDateUtils;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.*;
import com.jaytechwave.sacco.modules.payments.config.CoopConnectProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import com.jaytechwave.sacco.modules.payments.infrastructure.CoopHttpLogger;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Co-op Connect API client.
 *
 * <h3>Auth flow</h3>
 * OAuth2 client-credentials: POST /token with Basic auth →
 * cache the bearer token until 60 seconds before expiry →
 * attach as {@code Authorization: Bearer {token}} on every subsequent call.
 *
 * <h3>STK Push flow</h3>
 * {@link #initiateStkPush} → Co-op sends prompt to member's phone →
 * member enters PIN → Co-op posts result to our {@code /coop/stk-callback} →
 * {@link PaymentService#processStkCallback} handles the result.
 *
 * <h3>IPN flow (for manual paybill payments)</h3>
 * Member pays to paybill 400200 on their phone →
 * Co-op CBS posts to our {@code /coop/ipn} →
 * {@link PaymentService#processCoopIpn} credits the member's account.
 */
@Slf4j
@Service
public class CoopConnectService {

    private final CoopConnectProperties   props;
    private final UserRepository           userRepository;
    private final PiiSearchHashConverter   piiHashConverter;
    private final StringRedisTemplate redisTemplate;
    private final RestClient restClient;

    public CoopConnectService(CoopConnectProperties props,
                              UserRepository userRepository,
                              PiiSearchHashConverter piiHashConverter,
                              StringRedisTemplate redisTemplate) {
        this.props            = props;
        this.userRepository   = userRepository;
        this.piiHashConverter = piiHashConverter;
        this.redisTemplate    = redisTemplate;

        // Build the RestClient — route ALL Co-op traffic through the dedicated
        // gateway proxy (209.38.188.39) so Co-op always sees one static IP
        // regardless of which server the app is running on. If proxyHost is
        // not configured (local dev), bypass the proxy entirely.
        RestClient.Builder builder = RestClient.builder()
                .requestInterceptor(new CoopHttpLogger());

        if (props.getProxyHost() != null && !props.getProxyHost().isBlank()) {
            java.net.InetSocketAddress proxyAddress =
                    new java.net.InetSocketAddress(props.getProxyHost(), props.getProxyPort());
            java.net.Proxy proxy = new java.net.Proxy(java.net.Proxy.Type.HTTP, proxyAddress);

            org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                    new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setProxy(proxy);
            builder.requestFactory(factory);

            log.info("Co-op Connect: routing via proxy {}:{}", props.getProxyHost(), props.getProxyPort());
        } else {
            log.info("Co-op Connect: no proxy configured — connecting directly");
        }

        this.restClient = builder.build();
    }

    // == Token cache ===========================================================
    private final AtomicReference<String> cachedToken      = new AtomicReference<>();
    private final AtomicLong              tokenExpiresAtMs = new AtomicLong(0);
    private static final long             TOKEN_BUFFER_MS  = 60_000L; // refresh 60s early

    // Redis keys — token persisted across restarts to avoid Co-op CBS re-activation delay
    private static final String REDIS_TOKEN_KEY   = "coop:access_token";
    private static final String REDIS_EXPIRY_KEY  = "coop:token_expiry_ms";

    // == Token management ======================================================

    public synchronized String getAccessToken() {
        long now = System.currentTimeMillis();

        // 1. Check in-memory cache first (fastest)
        if (cachedToken.get() != null && now < tokenExpiresAtMs.get()) {
            return cachedToken.get();
        }

        // 2. Check Redis cache (survives restarts → prevents Co-op CBS re-activation delay)
        try {
            String redisToken  = redisTemplate.opsForValue().get(REDIS_TOKEN_KEY);
            String redisExpiry = redisTemplate.opsForValue().get(REDIS_EXPIRY_KEY);
            if (redisToken != null && redisExpiry != null) {
                long expiryMs = Long.parseLong(redisExpiry);
                if (now < expiryMs) {
                    log.info("Co-op Connect: reusing token from Redis (expires in {}s)",
                            (expiryMs - now) / 1000);
                    cachedToken.set(redisToken);
                    tokenExpiresAtMs.set(expiryMs);
                    return redisToken;
                }
            }
        } catch (Exception e) {
            log.warn("Co-op Connect: Redis token lookup failed → will fetch fresh token: {}", e.getMessage());
        }

        log.info("Co-op Connect: fetching new access token from {} /token", props.getBaseUrl());

        if (props.getConsumerKey() == null || props.getConsumerKey().isBlank()) {
            throw new RuntimeException("Co-op Connect: consumerKey not configured. Set COOP_CONSUMER_KEY.");
        }
        if (props.getConsumerSecret() == null || props.getConsumerSecret().isBlank()) {
            throw new RuntimeException("Co-op Connect: consumerSecret not configured. Set COOP_CONSUMER_SECRET.");
        }

        // Use pre-computed basicAuth if provided, otherwise encode key:secret
        String encoded;
        if (props.getBasicAuth() != null && !props.getBasicAuth().isBlank()) {
            encoded = props.getBasicAuth().trim();
            log.info("Co-op Connect: using pre-computed basicAuth value");
        } else {
            String credentials = props.getConsumerKey() + ":" + props.getConsumerSecret();
            encoded = Base64.getEncoder()
                    .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
            log.info("Co-op Connect: using encoded consumerKey:consumerSecret");
        }

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");

        try {
            CoopTokenResponse response = restClient.post()
                    .uri(props.getBaseUrl() + "/token")
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + encoded)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .body(CoopTokenResponse.class);

            if (response == null || response.accessToken() == null) {
                throw new RuntimeException("Co-op Connect: token response was null or missing accessToken field");
            }

            long expiryMs = now + ((long) response.expiresIn() * 1000L) - TOKEN_BUFFER_MS;
            cachedToken.set(response.accessToken());
            tokenExpiresAtMs.set(expiryMs);

            // Persist to Redis so token survives deployments/restarts
            try {
                long ttlSeconds = (expiryMs - now) / 1000;
                redisTemplate.opsForValue().set(REDIS_TOKEN_KEY,  response.accessToken(), Duration.ofSeconds(ttlSeconds));
                redisTemplate.opsForValue().set(REDIS_EXPIRY_KEY, String.valueOf(expiryMs), Duration.ofSeconds(ttlSeconds));
                log.info("Co-op Connect: token cached in memory + Redis, expires in {}s", response.expiresIn());
            } catch (Exception e) {
                log.warn("Co-op Connect: Redis token persist failed (in-memory only): {}", e.getMessage());
            }
            return response.accessToken();

        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            log.error("Co-op Connect: Authentication failed (401/403). " +
                            "Check your consumer key and secret. Status: {}, Response: {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Co-op Connect: Invalid credentials (401/403). " +
                    "Verify COOP_CONSUMER_KEY and COOP_CONSUMER_SECRET are correct.", e);
        } catch (HttpClientErrorException e) {
            log.error("Co-op Connect: HTTP {} error: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Co-op Connect: HTTP " + e.getStatusCode() + " error. " +
                    "Response: " + e.getResponseBodyAsString(), e);
        } catch (RestClientException e) {
            log.error("Co-op Connect: Network or SSL error: {}", e.getMessage(), e);
            throw new RuntimeException("Co-op Connect: Connection failed. " +
                    "Check base URL and SSL certificates. Error: " + e.getMessage(), e);
        }
    }

    /**
     * Clears the cached Co-op token from memory and Redis when a 401 is encountered.
     * Also called before STK push to ensure the token reflects the latest operator profile
     * permissions (e.g. after Co-op activates STK push on the BETTERLINK operator profile).
     */
    public void invalidateTokenCache() {
        clearTokenCache();
    }

    private void clearTokenCache() {
        log.warn("Co-op Connect: Clearing expired/revoked token from cache.");
        cachedToken.set(null);
        tokenExpiresAtMs.set(0);
        try {
            redisTemplate.delete(List.of(REDIS_TOKEN_KEY, REDIS_EXPIRY_KEY));
        } catch (Exception e) {
            log.warn("Failed to clear Redis token cache: {}", e.getMessage());
        }
    }

    /**
     * Wraps API calls. If Co-op returns a 401 Unauthorized (meaning our token was
     * revoked elsewhere), it clears the cache and safely retries the request once.
     */
    private <T> T executeWithTokenRetry(java.util.function.Supplier<T> apiCall) {
        try {
            return apiCall.get();
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == 401) {
                log.warn("Co-op Connect: 401 Unauthorized caught. Retrying with fresh token...");
                clearTokenCache();
                return apiCall.get(); // Try exactly once more
            }
            throw e;
        }
    }

    // == STK Push ==============================================================

    public StkPushResponse initiateStkPush(String phoneNumber,
                                           BigDecimal amount,
                                           String reference,
                                           String narration,
                                           String accountRef) {
        return executeWithTokenRetry(() -> {
            String callbackUrl = props.getCallbackBaseUrl() + "/api/v1/payments/coop/stk-callback";
            String messageDateTime = LocalDateTime.now(SaccoDateUtils.NAIROBI)
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"));

            // SAC-262 (critical fix): previously this method ignored the caller-supplied
            // `reference` and generated its own fresh UUID internally, sending THAT to
            // Co-op instead. Callers (PaymentService, SplitDepositService) store their
            // own generated ref as Payment.internalRef — but since Co-op never actually
            // received that ref, PendingPaymentPollingJob's status checks and the STK
            // callback handler (both of which look up by internalRef/MessageReference)
            // could never find a match. Every STK push silently sat PENDING for the full
            // 10-minute expiry window regardless of its real outcome (success, wrong PIN,
            // insufficient funds, etc.) — the specific failure reason was never recoverable.
            //
            // Fix: use the caller's reference directly. Callers already shorten it to
            // ≤20 hex chars (SAC-259's length-cap fix), so it satisfies Co-op's limit and
            // — critically — now actually matches what's stored as Payment.internalRef.
            String coopMessageRef = reference;

            StkPushRequest request = StkPushRequest.builder()
                    .messageReference(coopMessageRef)
                    .callBackUrl(callbackUrl)
                    .operatorCode(props.getOperatorCode())
                    .transactionCurrency("KES")
                    .mobileNumber(phoneNumber)
                    .narration(narration)
                    .amount(amount)
                    .messageDateTime(messageDateTime)
                    // SAC-257: AccountRef must be the member's account reference (member number),
                    // not the transaction message reference.
                    .otherDetails(List.of(OtherDetail.of("AccountRef", accountRef)))
                    .build();

            log.info("Co-op STK Push → phone={} amount={} messageRef={} accountRef={} callbackUrl={}",
                    phoneNumber, amount, coopMessageRef, accountRef, callbackUrl);

            try {
                StkPushResponse response = restClient.post()
                        .uri(props.getBaseUrl() + "/FT/stk/1.0.0")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(request)
                        .retrieve()
                        .body(StkPushResponse.class);

                log.info("Co-op STK Push response: code={} desc={}",
                        response != null ? response.getMessageCode() : "null",
                        response != null ? response.getMessageDescription() : "null");

                return response;
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() != 401) {
                    log.error("Co-op STK Push failed: HTTP {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
                    throw new RuntimeException("Co-op STK Push failed: " + e.getStatusCode().value()
                            + " " + e.getStatusText(), e);
                }
                throw e; // Let the retry wrapper handle 401
            } catch (HttpServerErrorException e) {
                // SAC-258: Co-op gateway 5xx responses are raw HTML, not JSON. Never surface
                // the body to the user — log it, throw a clean message.
                log.error("Co-op STK Push server error: {} — raw body: {}",
                        e.getStatusCode(), e.getResponseBodyAsString());
                throw new RuntimeException("Co-op Connect is temporarily unavailable (HTTP "
                        + e.getStatusCode().value() + "). Please try again shortly.", e);
            } catch (RestClientException e) {
                log.error("Co-op STK Push connection error: {}", e.getMessage());
                throw new RuntimeException("Could not reach Co-op Connect. Please try again shortly.", e);
            }
        });
    }

    // == Transaction status ====================================================

    public TransactionStatusResponse checkTransactionStatus(String messageReference) {
        return executeWithTokenRetry(() -> {
            TransactionStatusRequest req = new TransactionStatusRequest();
            req.setMessageReference(messageReference);

            return restClient.post()
                    .uri(props.getBaseUrl() + "/Enquiry/STK/1.0.0/")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(TransactionStatusResponse.class);
        });
    }

    // == Account balance (live — no cache) =====================================

    public AccountBalanceResponse getAccountBalance() {
        log.info("Co-op Connect: fetching live account balance for account={}", props.getSaccoAccountNumber());

        return executeWithTokenRetry(() -> {
            var req = new java.util.HashMap<String, String>();
            req.put("MessageReference", UUID.randomUUID().toString()); // FIXED: Full UUID
            req.put("UserId", "BETTERLINK"); // FIXED: Literal user ID profile, not paybill
            req.put("AccountNumber", props.getSaccoAccountNumber());

            log.info("CO-OP REQUEST: UserId='{}' Account='{}' Ref='{}'",
                    req.get("UserId"), req.get("AccountNumber"), req.get("MessageReference"));

            try {
                AccountBalanceResponse response = restClient.post()
                        .uri(props.getBaseUrl() + "/Enquiry/AccountBalance_v2/2.0.0/")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(req)
                        .retrieve()
                        .body(AccountBalanceResponse.class);

                if (response != null) {
                    log.info("CO-OP RESPONSE: code='{}' desc='{}' available='{}'",
                            response.getMessageCode(),
                            response.getMessageDescription(),
                            response.getAvailableBalance());
                } else {
                    log.warn("CO-OP RESPONSE: null response body");
                }
                return response;
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() != 401) {
                    log.error("Co-op balance HTTP client error: {} → {}", e.getStatusCode(), e.getResponseBodyAsString());
                    throw new RuntimeException("Co-op balance failed: " + e.getStatusCode().value()
                            + " " + e.getStatusText(), e);
                }
                throw e; // Let wrapper handle 401
            } catch (HttpServerErrorException e) {
                // SAC-258: Co-op's gateway returns a raw HTML error page on 5xx (not JSON).
                // HttpServerErrorException.getMessage() embeds that HTML body verbatim — never
                // surface it to the user. Log the full body for diagnosis, throw a clean message.
                log.error("Co-op balance HTTP server error: {} — raw body: {}",
                        e.getStatusCode(), e.getResponseBodyAsString());
                throw new RuntimeException("Co-op Connect is temporarily unavailable (HTTP "
                        + e.getStatusCode().value() + "). Please try again shortly.", e);
            } catch (RestClientException e) {
                log.error("Co-op balance connection error: {}", e.getMessage());
                throw new RuntimeException("Could not reach Co-op Connect: " + e.getMessage(), e);
            } catch (Exception e) {
                log.error("Co-op balance unexpected error: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to fetch balance. Please contact the system administrator.", e);
            }
        });
    }

    // == Mini statement ========================================================

    public MiniStatementResponse getMiniStatement() {
        return executeWithTokenRetry(() -> {
            var req = new java.util.HashMap<String, String>();
            req.put("MessageReference", UUID.randomUUID().toString()); // FIXED: Full UUID
            req.put("UserId", "BETTERLINK"); // FIXED: Literal user ID profile
            req.put("AccountNumber", props.getSaccoAccountNumber());

            log.info("Co-op Connect: fetching mini-statement for account={}", props.getSaccoAccountNumber());
            try {
                MiniStatementResponse response = restClient.post()
                        .uri(props.getBaseUrl() + "/Enquiry/MiniStatement/Account_v2/2.0.0/")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(req)
                        .retrieve()
                        .body(MiniStatementResponse.class);
                log.info("Co-op mini-statement: code={}", response != null ? response.getMessageCode() : "null");
                return response;
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() == 401) throw e;
                log.error("Co-op mini-statement failed: {}", e.getResponseBodyAsString());
                throw new RuntimeException("Failed to fetch mini-statement: " + e.getResponseBodyAsString(), e);
            } catch (Exception e) {
                log.error("Co-op mini-statement failed: {}", e.getMessage());
                throw new RuntimeException("Failed to fetch mini-statement: " + e.getMessage(), e);
            }
        });
    }

    // == Account transaction inquiry (date range) ==============================

    public AccountTransactionResponse getAccountTransactions(String fromDate, String toDate) {
        return executeWithTokenRetry(() -> {
            AccountTransactionRequest req = new AccountTransactionRequest();
            req.setMessageReference(UUID.randomUUID().toString()); // FIXED: Full UUID
            req.setUserId("BETTERLINK"); // FIXED: Literal user ID profile
            req.setAccountNumber(props.getSaccoAccountNumber());
            req.setStartDate(fromDate);
            req.setEndDate(toDate);

            log.info("Co-op transactions: account={} from={} to={}",
                    props.getSaccoAccountNumber(), fromDate, toDate);
            try {
                AccountTransactionResponse response = restClient.post()
                        .uri(props.getBaseUrl() + "/Enquiry/AccountTransaction/Account_v2/2.0.0/")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(req)
                        .retrieve()
                        .body(AccountTransactionResponse.class);
                log.info("Co-op transactions: code={} count={}",
                        response != null ? response.getMessageCode() : "null",
                        response != null && response.getTransactions() != null
                                ? response.getTransactions().size() : 0);
                return response;
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() == 401) throw e;
                log.error("Co-op transaction inquiry failed: {}", e.getResponseBodyAsString());
                throw new RuntimeException("Failed to fetch account transactions: " + e.getResponseBodyAsString(), e);
            } catch (Exception e) {
                log.error("Co-op transaction inquiry failed: {}", e.getMessage());
                throw new RuntimeException("Failed to fetch account transactions: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Resolves any Kenyan phone number format to a SACCO member's full name.
     *
     * <p>The fundamental problem: members register with whichever format they type
     * (e.g. "0717921562"), and that exact string gets hashed and stored.
     * Co-op's IPN narration always delivers the phone in international format
     * ("254717921562"). Because HMAC-SHA256 is format-sensitive, these two strings
     * produce completely different hashes — so a straight lookup always misses.
     *
     * <p>Fix: generate every valid Kenyan format of the same number and hash each
     * one, stopping as soon as one matches a user record.
     *
     * @param rawPhone any format: "0717921562", "254717921562", "+254717921562"
     * @return member full name, or null if no match found
     */
    public String resolvePhoneToMemberName(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) return null;
        try {
            // Build all candidate formats for this number
            java.util.List<String> candidates = buildPhoneCandidates(rawPhone);
            for (String candidate : candidates) {
                String hash = piiHashConverter.convertToDatabaseColumn(candidate);
                java.util.Optional<com.jaytechwave.sacco.modules.users.domain.entity.User> found =
                        userRepository.findByPhoneNumberHash(hash);
                if (found.isPresent() && found.get().getMember() != null) {
                    log.info("resolvePhoneToMemberName: ✅ matched '{}' → '{}' via format '{}'",
                            rawPhone,
                            found.get().getFirstName() + " " + found.get().getLastName(),
                            candidate);
                    return found.get().getFirstName() + " " + found.get().getLastName();
                }
            }
            log.info("resolvePhoneToMemberName: ❌ no member found for '{}' (tried formats: {})",
                    rawPhone, candidates);
            return null;
        } catch (Exception e) {
            log.warn("resolvePhoneToMemberName: lookup failed for {}: {}", rawPhone, e.getMessage());
            return null;
        }
    }

    /**
     * Generates all plausible storage formats for a Kenyan mobile number so that
     * a hash lookup succeeds regardless of how the number was originally saved.
     *
     * <p>Kenyan mobile prefixes are 07X or 01X.  International prefix is 254.
     * All carriers (Safaricom 07/01, Airtel 07, Telkom 07) follow this pattern.
     *
     * <p>Formats produced (example input: "254717921562"):
     * <ul>
     *   <li>254717921562  — E.164 without '+'</li>
     *   <li>+254717921562 — E.164 with '+'</li>
     *   <li>0717921562    — local 07/01 format</li>
     *   <li>717921562     — 9-digit trunk-stripped</li>
     * </ul>
     */
    private java.util.List<String> buildPhoneCandidates(String rawPhone) {
        java.util.List<String> out = new java.util.ArrayList<>();

        // Normalise: strip everything except digits and leading '+'
        String cleaned = rawPhone.trim();
        boolean hadPlus = cleaned.startsWith("+");
        String digits   = cleaned.replaceAll("[^0-9]", "");

        // Derive the 9-digit local suffix (e.g. "717921562")
        String nineSuffix = null;
        if (digits.startsWith("254") && digits.length() == 12) {
            nineSuffix = digits.substring(3);           // 254XXXXXXXXX → XXXXXXXXX
        } else if ((digits.startsWith("07") || digits.startsWith("01")) && digits.length() == 10) {
            nineSuffix = digits.substring(1);           // 07XXXXXXXX → 7XXXXXXXX
        } else if (digits.length() == 9) {
            nineSuffix = digits;                        // already trunk-stripped
        }

        if (nineSuffix == null) {
            // Unknown format — just try the raw string and its digits-only form
            out.add(rawPhone.trim());
            if (!rawPhone.trim().equals(digits)) out.add(digits);
            return out;
        }

        // All four canonical formats
        String international   = "254"  + nineSuffix;   // 254717921562
        String internationalE  = "+254" + nineSuffix;   // +254717921562
        String local07or01;
        if (nineSuffix.startsWith("7") || nineSuffix.startsWith("1")) {
            local07or01 = "0" + nineSuffix;             // 0717921562
        } else {
            local07or01 = "0" + nineSuffix;
        }
        String trunkStripped  = nineSuffix;             // 717921562

        // The most common storage formats first (local 07 form was historically popular)
        out.add(local07or01);
        out.add(international);
        out.add(internationalE);
        out.add(trunkStripped);

        // If the original input had a leading '+', also try the plain form
        if (hadPlus && !out.contains(cleaned)) out.add(cleaned);

        return out;
    }


}