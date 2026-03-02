package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.payments.config.DarajaProperties;
import com.jaytechwave.sacco.modules.payments.api.dto.DarajaDTOs.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class DarajaApiService {

    private final DarajaProperties darajaProperties;
    private final RestClient restClient = RestClient.create();

    private String getBaseUrl() {
        return "sandbox".equalsIgnoreCase(darajaProperties.getEnv())
                ? "https://sandbox.safaricom.co.ke"
                : "https://api.safaricom.co.ke";
    }

    public String getAccessToken() {
        String url = getBaseUrl() + "/oauth/v1/generate?grant_type=client_credentials";
        String credentials = darajaProperties.getConsumerKey() + ":" + darajaProperties.getConsumerSecret();
        String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

        DarajaOAuthResponse response = restClient.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Basic " + encodedCredentials)
                .retrieve()
                .body(DarajaOAuthResponse.class);

        return response != null ? response.accessToken() : null;
    }

    public StkPushSyncResponse initiateStkPush(String phoneNumber, String amount, String accountReference, String transactionDesc) {
        String token = getAccessToken();
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String password = Base64.getEncoder().encodeToString(
                (darajaProperties.getShortcode() + darajaProperties.getPasskey() + timestamp).getBytes(StandardCharsets.UTF_8)
        );

        String callbackUrl = darajaProperties.getCallbackBaseUrl() + darajaProperties.getEndpoints().getMpesaExpressCallback();

        StkPushRequest requestPayload = StkPushRequest.builder()
                .businessShortCode(darajaProperties.getShortcode())
                .password(password)
                .timestamp(timestamp)
                .transactionType("CustomerPayBillOnline")
                .amount(amount)
                .partyA(phoneNumber)
                .partyB(darajaProperties.getShortcode())
                .phoneNumber(phoneNumber)
                .callBackURL(callbackUrl)
                .accountReference(accountReference)
                .transactionDesc(transactionDesc)
                .build();

        log.info("Initiating STK Push for phone {} amount {}", phoneNumber, amount);

        return restClient.post()
                .uri(getBaseUrl() + "/mpesa/stkpush/v1/processrequest")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestPayload)
                .retrieve()
                .body(StkPushSyncResponse.class);
    }
}