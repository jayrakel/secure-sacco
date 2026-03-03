package com.jaytechwave.sacco.modules.loans.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public class LoanDTOs {

    public record LoanProductRequest(
            @NotBlank(message = "Name is required")
            String name,

            String description,

            @NotBlank(message = "Repayment frequency is required")
            String repaymentFrequency,

            @NotNull(message = "Term weeks is required")
            @Min(value = 1, message = "Term must be at least 1 week")
            Integer termWeeks,

            @NotBlank(message = "Interest model is required")
            String interestModel,

            @NotNull(message = "Interest rate is required")
            @DecimalMin(value = "0.0", message = "Interest rate must be 0 or greater")
            BigDecimal interestRate,

            @NotNull(message = "Application fee is required")
            @DecimalMin(value = "0.0", message = "Application fee must be 0 or greater")
            BigDecimal applicationFee,

            @NotNull(message = "Grace period days is required")
            @Min(value = 0, message = "Grace period must be 0 or greater")
            Integer gracePeriodDays,

            Boolean isActive
    ) {}

    public record LoanProductResponse(
            UUID id,
            String name,
            String description,
            String repaymentFrequency,
            Integer termWeeks,
            String interestModel,
            BigDecimal interestRate,
            BigDecimal applicationFee,
            Integer gracePeriodDays,
            Boolean isActive
    ) {}
}