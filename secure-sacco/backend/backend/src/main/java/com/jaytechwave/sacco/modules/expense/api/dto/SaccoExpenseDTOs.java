package com.jaytechwave.sacco.modules.expense.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

public class SaccoExpenseDTOs {

    public record RecordSaccoExpenseRequest(
            @NotNull(message = "Expense date is required")
            LocalDate expenseDate,

            @NotNull(message = "Amount is required")
            @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
            BigDecimal amount,

            @NotBlank(message = "GL Account Code is required")
            String glAccountCode,

            @NotBlank(message = "Narration is required")
            String narration,

            String reference
    ) {}

    public record SaccoExpenseResponse(
            UUID id,
            LocalDate expenseDate,
            BigDecimal amount,
            String glAccountCode,
            String narration,
            String reference,
            String journalReference,
            UUID createdByUserId,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt
    ) {}
}
