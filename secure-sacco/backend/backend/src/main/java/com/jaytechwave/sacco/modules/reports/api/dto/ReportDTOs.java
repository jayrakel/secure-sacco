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
    public static class StatementSummaryDTO {
        private BigDecimal loanDisbursed = BigDecimal.ZERO;
        private BigDecimal loanRepaid = BigDecimal.ZERO;
        private BigDecimal loanOutstanding = BigDecimal.ZERO;
        private BigDecimal savingsDeposited = BigDecimal.ZERO;
        private BigDecimal savingsWithdrawn = BigDecimal.ZERO;
        private BigDecimal penaltiesCharged = BigDecimal.ZERO;
        private BigDecimal penaltiesPaid = BigDecimal.ZERO;
        private BigDecimal penaltiesOutstanding = BigDecimal.ZERO;
    }

    @Data
    public static class StatementResponseDTO {
        private java.util.List<StatementItemDTO> items;
        private StatementSummaryDTO summary;
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

    // Individual payment row for the drilldown table on the Daily Collections page.
    // Fields map 1-to-1 with columns on the `payments` table.
    @Data
    public static class PaymentLineDTO {
        private String id;
        private String transactionRef;    // Co-op CBS TransactionId (e.g. CB1287153_05062026_2) — used for idempotency
        private String mpesaRef;          // M-Pesa receipt/reference code (e.g. UF5BY709I7) — shown in UI
        private String internalRef;       // Internal tracking reference
        private BigDecimal amount;
        private String paymentMethod;     // MPESA_COOP_IPN, MPESA_COOP
        private String paymentType;       // PAYBILL_DEPOSIT, STK_PUSH
        private String accountReference;  // Member number typed by payer
        private String senderName;
        private String senderPhoneNumber;
        private String status;
        private String createdAt;
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

    // ── General Statement (SAC-263) — true system-wide financial position ────

    @Data
    public static class GeneralStatementLineDTO {
        private String transactionDate;
        private String reference;       // live mpesa ref where available, else internal/system ref
        private String description;
        private String accountCode;
        private String accountName;
        private String accountType;     // ASSET, LIABILITY, REVENUE, EXPENSE, EQUITY
        private BigDecimal debitAmount = BigDecimal.ZERO;
        private BigDecimal creditAmount = BigDecimal.ZERO;
        private BigDecimal runningBalance; // signed running balance for the account, in display order
    }

    @Data
    public static class GeneralStatementDTO {
        private String fromDate;
        private String toDate;
        private BigDecimal totalDebits = BigDecimal.ZERO;
        private BigDecimal totalCredits = BigDecimal.ZERO;
        private java.util.List<GeneralStatementLineDTO> lines = new java.util.ArrayList<>();
    }
}