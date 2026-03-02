package com.jaytechwave.sacco.modules.payments.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

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

    @Data
    public static class StkCallbackResponse {
        @JsonProperty("Body")
        private Body body;

        @Data
        public static class Body {
            @JsonProperty("stkCallback")
            private StkCallback stkCallback;
        }

        @Data
        public static class StkCallback {
            @JsonProperty("MerchantRequestID")
            private String merchantRequestID;
            @JsonProperty("CheckoutRequestID")
            private String checkoutRequestID;
            @JsonProperty("ResultCode")
            private Integer resultCode;
            @JsonProperty("ResultDesc")
            private String resultDesc;
            @JsonProperty("CallbackMetadata")
            private CallbackMetadata callbackMetadata;
        }

        @Data
        public static class CallbackMetadata {
            @JsonProperty("Item")
            private List<Item> item;
        }

        @Data
        public static class Item {
            @JsonProperty("Name")
            private String name;
            @JsonProperty("Value")
            private Object value; // Value can be Number, String, or Null
        }
    }
}