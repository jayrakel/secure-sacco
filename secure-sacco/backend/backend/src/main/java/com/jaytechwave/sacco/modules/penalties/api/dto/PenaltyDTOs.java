package com.jaytechwave.sacco.modules.penalties.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public class PenaltyDTOs {

    public record PenaltyRuleRequest(
            @NotBlank(message = "Code is required")
            String code,

            @NotBlank(message = "Name is required")
            String name,

            String description,

            @NotBlank(message = "Base amount type is required")
            String baseAmountType,

            @NotNull(message = "Base amount value is required")
            @DecimalMin(value = "1.0", message = "Base amount value must be 1 or greater")
            BigDecimal baseAmountValue,

            @NotNull(message = "Grace period days is required")
            @Min(value = 0, message = "Grace period cannot be negative")
            Integer gracePeriodDays,

            @NotNull(message = "Interest period days is required")
            @Min(value = 1, message = "Interest period must be at least 1 day")
            Integer interestPeriodDays,

            @NotNull(message = "Interest rate is required")
            @DecimalMin(value = "0.0", message = "Interest rate must be 0 or greater")
            BigDecimal interestRate,

            @NotBlank(message = "Interest mode is required")
            String interestMode,

            Boolean isActive
    ) {}

    public record PenaltyRuleResponse(
            UUID id,
            String code,
            String name,
            String description,
            String baseAmountType,
            BigDecimal baseAmountValue,
            Integer gracePeriodDays,
            Integer interestPeriodDays,
            BigDecimal interestRate,
            String interestMode,
            Boolean isActive
    ) {}

    public record PenaltySummaryResponse(
            UUID id, String ruleCode, String ruleName,
            BigDecimal originalAmount, BigDecimal outstandingAmount,
            BigDecimal principalPaid, BigDecimal interestPaid, BigDecimal amountWaived,
            String status, java.time.LocalDateTime createdAt
    ) {}

    public record PayPenaltyRequest(
            @NotBlank(message = "Phone number is required") String phoneNumber,
            @NotNull(message = "Amount is required") @DecimalMin(value = "1.0", message = "Amount must be at least 1") BigDecimal amount,
            UUID penaltyId // If null, the engine will automatically pay ALL open penalties oldest-first!
    ) {}

    public record PenaltyRepaymentResponse(
            UUID id, BigDecimal amount, BigDecimal principalAllocated,
            BigDecimal interestAllocated, String status
    ) {}

    public record WaivePenaltyRequest(
            @NotNull(message = "Amount is required")
            @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
            BigDecimal amount,

            @NotBlank(message = "Reason is required for auditing purposes")
            String reason
    ) {}
}