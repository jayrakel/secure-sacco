package com.jaytechwave.sacco.modules.payments.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

public class CoopConnectDTOs {

    // ── Token ─────────────────────────────────────────────────────────────────

    public record CoopTokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in")   int expiresIn,
            @JsonProperty("token_type")   String tokenType
    ) {}

    // ── STK Push request ──────────────────────────────────────────────────────

    @Data
    @Builder
    public static class StkPushRequest {
        @JsonProperty("MessageReference")
        private String messageReference;

        @JsonProperty("CallBackUrl")
        private String callBackUrl;

        @JsonProperty("OperatorCode")
        private String operatorCode;

        @JsonProperty("TransactionCurrency")
        private String transactionCurrency;

        @JsonProperty("MobileNumber")
        private String mobileNumber;

        @JsonProperty("Narration")
        private String narration;

        @JsonProperty("Amount")
        private BigDecimal amount;

        @JsonProperty("MessageDateTime")
        private String messageDateTime;

        @JsonProperty("OtherDetails")
        private List<OtherDetail> otherDetails;
    }

    @Data
    public static class OtherDetail {
        @JsonProperty("Name")
        private String name;

        @JsonProperty("Value")
        private String value;

        public static OtherDetail of(String name, String value) {
            OtherDetail d = new OtherDetail();
            d.setName(name);
            d.setValue(value);
            return d;
        }
    }

    // ── STK Push response (sync from Co-op) ───────────────────────────────────

    @Data
    public static class StkPushResponse {
        @JsonProperty("MessageReference")
        private String messageReference;

        @JsonProperty("MessageCode")
        private String messageCode;

        @JsonProperty("MessageDescription")
        private String messageDescription;
    }

    // ── STK Push callback (Co-op posts to our /coop/stk-callback) ────────────

    @Data
    public static class StkCallbackPayload {
        @JsonProperty("MessageReference")
        private String messageReference;

        @JsonProperty("MessageCode")
        private String messageCode;

        @JsonProperty("MessageDescription")
        private String messageDescription;

        @JsonProperty("Amount")
        private String amount;

        @JsonProperty("TransactionID")
        private String transactionId;

        @JsonProperty("MobileNumber")
        private String mobileNumber;

        @JsonProperty("OperatorCode")
        private String operatorCode;
    }

    // ── Transaction status enquiry ────────────────────────────────────────────

    @Data
    public static class TransactionStatusRequest {
        @JsonProperty("MessageReference")
        private String messageReference;
    }

    @Data
    public static class TransactionStatusResponse {
        @JsonProperty("MessageReference")
        private String messageReference;

        @JsonProperty("MessageCode")
        private String messageCode;

        @JsonProperty("MessageDescription")
        private String messageDescription;

        @JsonProperty("Amount")
        private String amount;

        @JsonProperty("TransactionID")
        private String transactionId;

        @JsonProperty("MobileNumber")
        private String mobileNumber;

        @JsonProperty("Narration")
        private String narration;
    }

    // ── B2B IPN (Co-op CBS posts to our /coop/ipn) ───────────────────────────

    @Data
    public static class CoopIpnPayload {
        @JsonProperty("AcctNo")
        private String acctNo;

        @JsonProperty("Amount")
        private String amount;

        @JsonProperty("BookedBalance")
        private String bookedBalance;

        @JsonProperty("ClearedBalance")
        private String clearedBalance;

        @JsonProperty("Currency")
        private String currency;

        @JsonProperty("CustMemoLine1")
        private String custMemoLine1;

        @JsonProperty("CustMemoLine2")
        private String custMemoLine2;

        @JsonProperty("CustMemoLine3")
        private String custMemoLine3;

        @JsonProperty("EventType")
        private String eventType;

        @JsonProperty("ExchangeRate")
        private String exchangeRate;

        @JsonProperty("Narration")
        private String narration;

        @JsonProperty("PaymentRef")
        private String paymentRef;

        @JsonProperty("PostingDate")
        private String postingDate;

        @JsonProperty("ValueDate")
        private String valueDate;

        @JsonProperty("TransactionDate")
        private String transactionDate;

        @JsonProperty("TransactionId")
        private String transactionId;
    }

    // ── IPN acknowledgement (we return this to Co-op) ────────────────────────

    public record IpnAckResponse(
            @JsonProperty("MessageCode")    String messageCode,
            @JsonProperty("Message")        String message
    ) {
        public static IpnAckResponse ok() {
            return new IpnAckResponse("200", "Successfully received data");
        }
        public static IpnAckResponse error(String reason) {
            return new IpnAckResponse("500", reason);
        }
    }
}