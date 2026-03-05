package com.jaytechwave.sacco.modules.reports.api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
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

    @Data
    public static class MemberMiniSummaryDTO {
        private BigDecimal savingsBalance = BigDecimal.ZERO;
        private BigDecimal loanArrears = BigDecimal.ZERO;
        private BigDecimal penaltyOutstanding = BigDecimal.ZERO;
        private String activeLoanStatus = "NONE";
        private String nextDueDate = null;
    }

    @Data
    public static class LoanArrearsDTO {
        private String memberNumber;
        private String memberName;
        private String loanId;
        private String productName;
        private BigDecimal amountOverdue;
        private int daysOverdue;
        private String bucket;
    }

    @Data
    public static class DailyCollectionDTO {
        private String date;
        private BigDecimal totalCollected = BigDecimal.ZERO;
        private Map<String, BigDecimal> byChannel = new HashMap<>();
        private Map<String, BigDecimal> byType = new HashMap<>();
    }

    @Data
    public static class IncomeCategoryDTO {
        private String category;
        private BigDecimal amount;
    }

    @Data
    public static class IncomeReportDTO {
        private String fromDate;
        private String toDate;
        private BigDecimal totalIncome = BigDecimal.ZERO;
        private java.util.List<IncomeCategoryDTO> categories = new java.util.ArrayList<>();
    }
}
