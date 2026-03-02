package com.jaytechwave.sacco.modules.payments.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

public class DarajaDTOs {

    public record DarajaOAuthResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") String expiresIn
    ) {}

    @Data
    @Builder
    public static class StkPushRequest {
        @JsonProperty("BusinessShortCode")
        private String businessShortCode;
        @JsonProperty("Password")
        private String password;
        @JsonProperty("Timestamp")
        private String timestamp;
        @JsonProperty("TransactionType")
        private String transactionType;
        @JsonProperty("Amount")
        private String amount;
        @JsonProperty("PartyA")
        private String partyA;
        @JsonProperty("PartyB")
        private String partyB;
        @JsonProperty("PhoneNumber")
        private String phoneNumber;
        @JsonProperty("CallBackURL")
        private String callBackURL;
        @JsonProperty("AccountReference")
        private String accountReference;
        @JsonProperty("TransactionDesc")
        private String transactionDesc;
    }

    @Data
    public static class StkPushSyncResponse {
        @JsonProperty("MerchantRequestID")
        private String merchantRequestID;
        @JsonProperty("CheckoutRequestID")
        private String checkoutRequestID;
        @JsonProperty("ResponseCode")
        private String responseCode;
        @JsonProperty("ResponseDescription")
        private String responseDescription;
        @JsonProperty("CustomerMessage")
        private String customerMessage;
    }
}