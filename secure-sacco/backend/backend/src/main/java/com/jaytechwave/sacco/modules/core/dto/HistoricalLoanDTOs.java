package com.jaytechwave.sacco.modules.core.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class HistoricalLoanDTOs {

    public record HistoricalLoanDisbursementRequest(
            String memberNumber,
            String loanProductCode,
            BigDecimal principal,
            BigDecimal interest,
            BigDecimal weeklyScheduled,
            LocalDate firstPaymentDate,
            Integer termWeeks,
            String referenceNumber
    ) {}

    public record HistoricalLoanRepaymentRequest(
            String memberNumber,
            BigDecimal amount,
            LocalDate transactionDate,
            String referenceNumber
    ) {}

    public record HistoricalRefinanceRequest(
            UUID oldLoanId,
            String loanProductCode,
            BigDecimal newPrincipalFaceValue, // e.g., 849,354
            Integer newTermWeeks,             // e.g., 31
            BigDecimal scheduledWeeklyAmount, // e.g., 27,288.50
            java.time.LocalDate refinanceDate,
            String referenceNumber
    ) {}
}