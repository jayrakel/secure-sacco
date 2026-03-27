package com.jaytechwave.sacco.modules.core.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record HistoricalWithdrawalRequest(
        @NotBlank(message = "Member number is required") String memberNumber,
        @NotNull(message = "Amount is required") @DecimalMin(value = "1.0", message = "Amount must be greater than zero") BigDecimal amount,
        @NotBlank(message = "Reference number is required") String referenceNumber,
        @NotNull(message = "Original transaction date is required") LocalDate transactionDate
) {}