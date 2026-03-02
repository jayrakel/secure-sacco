package com.jaytechwave.sacco.modules.payments.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class PaymentDTOs {

    public record InitiateStkRequest(
            @NotBlank(message = "Phone number is required")
            String phoneNumber, // Expected format: 2547XXXXXXXX

            @NotNull(message = "Amount is required")
            @DecimalMin(value = "1.0", message = "Amount must be at least 1")
            BigDecimal amount,

            @NotBlank(message = "Account reference is required")
            String accountReference // E.g., Member Number
    ) {}

    public record InitiateStkResponse(
            String message,
            String checkoutRequestID,
            String customerMessage
    ) {}
}