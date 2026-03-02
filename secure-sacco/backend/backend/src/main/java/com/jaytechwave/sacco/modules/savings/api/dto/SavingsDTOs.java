package com.jaytechwave.sacco.modules.savings.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class SavingsDTOs {

    public record ManualDepositRequest(
            @NotNull(message = "Member ID is required")
            UUID memberId,

            @NotNull(message = "Amount is required")
            @DecimalMin(value = "1.0", message = "Amount must be at least 1.0")
            BigDecimal amount,

            String referenceNotes
    ) {}

    public record SavingsTransactionResponse(
            UUID transactionId,
            UUID savingsAccountId,
            String type,
            String channel,
            BigDecimal amount,
            String reference,
            String status,
            LocalDateTime postedAt
    ) {}
}