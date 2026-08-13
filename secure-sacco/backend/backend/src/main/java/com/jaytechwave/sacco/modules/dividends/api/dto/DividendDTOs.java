package com.jaytechwave.sacco.modules.dividends.api.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

public class DividendDTOs {

    @Data
    public static class DeclareDividendRequest {
        private Integer financialYear;
        private BigDecimal ratePercentage;
        private String calculationMode = "SHARE_CAPITAL";
    }

    @Data
    public static class PreviewDividendItem {
        private UUID memberId;
        private String memberNumber;
        private String memberName;
        private BigDecimal grossDividend;
        private BigDecimal arrears;
        private BigDecimal netDividend;
        private BigDecimal baseAmount;
    }

    @Data
    public static class PreviewDividendResponse {
        private BigDecimal totalDividend;
        private java.util.List<PreviewDividendItem> items;
    }
}
