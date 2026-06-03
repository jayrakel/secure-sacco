package com.jaytechwave.sacco.modules.payments.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "sacco.coopconnect")
public class CoopConnectProperties {

    /** Co-op Connect API consumer key (from onboarding). */
    private String consumerKey;

    /** Co-op Connect API consumer secret (from onboarding). */
    private String consumerSecret;

    /**
     * Optional: pre-computed Basic auth value (Base64 of key:secret).
     * If set, this is used directly instead of encoding consumerKey + consumerSecret.
     * Set COOP_BASIC_AUTH in GitHub secrets to the value Co-op provided.
     * Format: the raw Base64 string only (without the "Basic " prefix).
     */
    private String basicAuth;

    /**
     * Operator code assigned by Co-op Bank.
     * For Betterlink Ventures: "BETTERLINK"
     */
    private String operatorCode = "BETTERLINK";

    /** Base URL. Production: https://openapi.co-opbank.co.ke */
    private String baseUrl = "https://openapi.co-opbank.co.ke";

    /**
     * Base URL for our callback endpoints.
     * Co-op will post STK results to: {callbackBaseUrl}/api/v1/payments/coop/stk-callback
     * Co-op IPN will post to: {callbackBaseUrl}/api/v1/payments/coop/ipn
     */
    private String callbackBaseUrl = "https://api-staging.jaytechwavesolutions.co.ke";

    /**
     * Comma-separated IP addresses / CIDR ranges that are allowed to call
     * our callback endpoints. These should be Co-op Connect's server IPs.
     * Update once Co-op provides their IP whitelist.
     */
    private String allowedCallbackIps = "";

    /**
     * SACCO's Co-op Bank account number (for balance and mini-statement queries).
     */
    private String saccoAccountNumber = "";
}