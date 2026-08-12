package com.jaytechwave.sacco.modules.dividends.api.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

public class DividendDTOs {

    @Data
    public static class DeclareDividendRequest {
        private Integer financialYear;
        private BigDecimal ratePercentage;
    }
}
