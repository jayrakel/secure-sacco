package com.jaytechwave.sacco.modules.accounting.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class JournalEntryDTOs {

    public record CreateJournalEntryRequest(
            @NotNull(message = "Transaction date is required")
            LocalDate transactionDate,

            @NotBlank(message = "Reference number is required")
            String referenceNumber,

            @NotBlank(message = "Description is required")
            String description,

            @NotEmpty(message = "Journal entry must have at least two lines")
            @Valid
            List<JournalEntryLineRequest> lines
    ) {}

    public record JournalEntryLineRequest(
            @NotBlank(message = "Account code is required")
            String accountCode,

            UUID memberId, // Optional: Link debit/credit to a specific member

            @NotNull(message = "Debit amount is required")
            @DecimalMin(value = "0.0", inclusive = true, message = "Debit must be positive")
            BigDecimal debitAmount,

            @NotNull(message = "Credit amount is required")
            @DecimalMin(value = "0.0", inclusive = true, message = "Credit must be positive")
            BigDecimal creditAmount,

            String description // Optional line-level description
    ) {}

    public record JournalEntryResponse(
            UUID id,
            LocalDate transactionDate,
            String referenceNumber,
            String description,
            String status,
            List<JournalEntryLineResponse> lines
    ) {}

    public record JournalEntryLineResponse(
            UUID id,
            String accountCode,
            String accountName,
            UUID memberId,
            BigDecimal debitAmount,
            BigDecimal creditAmount,
            String description
    ) {}
}