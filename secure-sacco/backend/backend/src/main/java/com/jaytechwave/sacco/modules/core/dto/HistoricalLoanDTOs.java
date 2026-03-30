package com.jaytechwave.sacco.modules.core.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

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
}