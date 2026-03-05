package com.jaytechwave.sacco.modules.reports.api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

public class ReportDTOs {

    @Data
    public static class FinancialOverviewDTO {
        private UUID memberId;
        private String memberNumber;
        private String firstName;
        private String lastName;
        private BigDecimal totalSavings;
        private BigDecimal loanPrincipal;
        private BigDecimal loanInterest;
        private BigDecimal loanArrears;
        private BigDecimal loanCredit;
        private BigDecimal penaltyOutstanding;
    }

    @Data
    public static class StatementItemDTO {
        private String date;
        private String module;
        private String type;
        private BigDecimal amount;
        private String reference;
        private String description;
    }
}