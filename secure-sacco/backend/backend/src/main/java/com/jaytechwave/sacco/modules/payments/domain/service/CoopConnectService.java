package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.core.util.SaccoDateUtils;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.*;
import com.jaytechwave.sacco.modules.payments.config.CoopConnectProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
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
@RequiredArgsConstructor
public class CoopConnectService {

    private final CoopConnectProperties props;
    private final RestClient restClient = RestClient.create();

    // ── Token cache ───────────────────────────────────────────────────────────
    private final AtomicReference<String> cachedToken      = new AtomicReference<>();
    private final AtomicLong              tokenExpiresAtMs  = new AtomicLong(0);
    private static final long             TOKEN_BUFFER_MS   = 60_000L; // refresh 60s early

    // ── Token management ──────────────────────────────────────────────────────

    public synchronized String getAccessToken() {
        long now = System.currentTimeMillis();
        if (cachedToken.get() != null && now < tokenExpiresAtMs.get()) {
            return cachedToken.get();
        }

        log.info("Co-op Connect: fetching new access token from {} /token", props.getBaseUrl());

        if (props.getConsumerKey() == null || props.getConsumerKey().isBlank()) {
            throw new RuntimeException("Co-op Connect: consumerKey not configured. Set COOP_CONSUMER_KEY.");
        }
        if (props.getConsumerSecret() == null || props.getConsumerSecret().isBlank()) {
            throw new RuntimeException("Co-op Connect: consumerSecret not configured. Set COOP_CONSUMER_SECRET.");
        }

        String credentials = props.getConsumerKey() + ":" + props.getConsumerSecret();
        String encoded = Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

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

            cachedToken.set(response.accessToken());
            // expires_in is in seconds; subtract buffer so we refresh early
            tokenExpiresAtMs.set(now + ((long) response.expiresIn() * 1000L) - TOKEN_BUFFER_MS);
            log.info("Co-op Connect: access token cached, expires in {}s", response.expiresIn());
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

    // ── STK Push ──────────────────────────────────────────────────────────────

    /**
     * Initiates an STK push prompt on the member's phone.
     *
     * @param phoneNumber  Member's phone in international format (2547XXXXXXXX)
     * @param amount       Amount to request
     * @param reference    Unique payment reference (used as MessageReference)
     * @param narration    Description shown on the STK prompt
     * @return Co-op Connect's sync response
     */
    public StkPushResponse initiateStkPush(String phoneNumber,
                                           BigDecimal amount,
                                           String reference,
                                           String narration) {
        String callbackUrl = props.getCallbackBaseUrl()
                + "/api/v1/payments/coop/stk-callback";

        String messageDateTime = LocalDateTime.now(SaccoDateUtils.NAIROBI)
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"));

        StkPushRequest request = StkPushRequest.builder()
                .messageReference(reference)
                .callBackUrl(callbackUrl)
                .operatorCode(props.getOperatorCode())
                .transactionCurrency("KES")
                .mobileNumber(phoneNumber)
                .narration(narration)
                .amount(amount)
                .messageDateTime(messageDateTime)
                .otherDetails(List.of(OtherDetail.of("AccountRef", reference)))
                .build();

        log.info("Co-op STK Push → phone={} amount={} ref={} callbackUrl={}", phoneNumber, amount, reference, callbackUrl);

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
            log.error("Co-op STK Push failed: HTTP {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Co-op STK Push failed: " + e.getStatusCode() + " - " +
                    e.getResponseBodyAsString(), e);
        } catch (RestClientException e) {
            log.error("Co-op STK Push connection error: {}", e.getMessage(), e);
            throw new RuntimeException("Co-op STK Push connection error: " + e.getMessage(), e);
        }
    }

    // ── Transaction status ────────────────────────────────────────────────────

    public TransactionStatusResponse checkTransactionStatus(String messageReference) {
        TransactionStatusRequest req = new TransactionStatusRequest();
        req.setMessageReference(messageReference);

        return restClient.post()
                .uri(props.getBaseUrl() + "/Enquiry/STK/1.0.0/")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(req)
                .retrieve()
                .body(TransactionStatusResponse.class);
    }

    // ── Account balance (cached for 5 minutes) ───────────────────────────────

    private final AtomicReference<AccountBalanceResponse> cachedBalance = new AtomicReference<>();
    private final AtomicLong balanceCachedAtMs = new AtomicLong(0);
    private static final long BALANCE_CACHE_MS = 5 * 60 * 1000L;

    public AccountBalanceResponse getAccountBalance() {
        long now = System.currentTimeMillis();
        AccountBalanceResponse cached = cachedBalance.get();
        if (cached != null && now < balanceCachedAtMs.get()) {
            log.debug("Co-op Connect: returning cached account balance");
            return cached;
        }
        log.info("Co-op Connect: fetching account balance for account={}", props.getSaccoAccountNumber());
        try {
            var req = new java.util.HashMap<String, String>();
            req.put("MessageReference", UUID.randomUUID().toString().replace("-", "").substring(0, 12));
            req.put("UserId", props.getOperatorCode());
            req.put("AccountNumber", props.getSaccoAccountNumber());

            // 🟢 ADD THIS SNOOPING LOG:
            log.error("CO-OP SNOOP: Sending payload to bank -> UserId='{}', Account='{}', Ref='{}'",
                    req.get("UserId"), req.get("AccountNumber"), req.get("MessageReference"));

            AccountBalanceResponse response = restClient.post()
                    .uri(props.getBaseUrl() + "/Enquiry/AccountBalance_v2/2.0.0/")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(AccountBalanceResponse.class);

            if (response != null && "0".equals(response.getMessageCode())) {
                cachedBalance.set(response);
                balanceCachedAtMs.set(now + BALANCE_CACHE_MS);
                log.info("Co-op Connect: balance fetched — available={}", response.getAvailableBalance());
            } else {
                log.warn("Co-op Connect: balance fetch failed — code={} desc={}",
                        response != null ? response.getMessageCode() : "null",
                        response != null ? response.getMessageDescription() : "null");
            }
            return response;
        } catch (Exception e) {
            log.error("Co-op Connect: failed to fetch account balance — {}", e.getMessage());
            return cached; // return stale cache rather than null on error
        }
    }

    // ── Mini statement ────────────────────────────────────────────────────────

    public MiniStatementResponse getMiniStatement() {
        var req = new java.util.HashMap<String, String>();
        req.put("MessageReference", UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        req.put("UserId", props.getOperatorCode());
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
            log.info("Co-op Connect: mini-statement fetched — code={}", response != null ? response.getMessageCode() : "null");
            return response;
        } catch (Exception e) {
            log.error("Co-op Connect: mini-statement failed — {}", e.getMessage());
            throw new RuntimeException("Failed to fetch mini-statement: " + e.getMessage(), e);
        }
    }

    // ── Account transaction inquiry (date range) ──────────────────────────────

    /**
     * Fetch all transactions for the SACCO account between two dates.
     * Co-op endpoint: POST /Enquiry/AccountTransaction/Account_v2/2.0.0/
     *
     * @param fromDate  Start date in YYYY-MM-DD format
     * @param toDate    End date in YYYY-MM-DD format (inclusive)
     */
    public AccountTransactionResponse getAccountTransactions(String fromDate, String toDate) {
        AccountTransactionRequest req = new AccountTransactionRequest();
        req.setMessageReference(UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        req.setUserId(props.getOperatorCode());
        req.setAccountNumber(props.getSaccoAccountNumber());
        req.setStartDate(fromDate);
        req.setEndDate(toDate);

        log.info("Co-op Connect: fetching transactions account={} from={} to={}",
                props.getSaccoAccountNumber(), fromDate, toDate);
        try {
            AccountTransactionResponse response = restClient.post()
                    .uri(props.getBaseUrl() + "/Enquiry/AccountTransaction/Account_v2/2.0.0/")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(AccountTransactionResponse.class);
            log.info("Co-op Connect: transactions fetched — code={} count={}",
                    response != null ? response.getMessageCode() : "null",
                    response != null && response.getTransactions() != null ? response.getTransactions().size() : 0);
            return response;
        } catch (Exception e) {
            log.error("Co-op Connect: transaction inquiry failed — {}", e.getMessage());
            throw new RuntimeException("Failed to fetch account transactions: " + e.getMessage(), e);
        }
    }
}