package com.jaytechwave.sacco.modules.loans.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
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

    public record CreateLoanApplicationRequest(
            @NotNull(message = "Loan Product ID is required")
            UUID productId,

            @NotNull(message = "Principal amount is required")
            @DecimalMin(value = "1.0", message = "Amount must be at least 1")
            BigDecimal principalAmount,

            @NotBlank(message = "Purpose is required")
            String purpose
    ) {}

    public record PayLoanFeeRequest(
            @NotBlank(message = "Phone number is required")
            String phoneNumber
    ) {}

    public record LoanApplicationResponse(
            UUID id,
            UUID memberId,
            UUID productId,
            String productName,
            BigDecimal principalAmount,
            BigDecimal applicationFee,
            Boolean applicationFeePaid,
            String status,
            String purpose,
            LocalDateTime createdAt
    ) {}

    public record AddGuarantorRequest(
            @NotBlank(message = "Guarantor Member Number is required")
            String memberNumber,

            @NotNull(message = "Guaranteed amount is required")
            @DecimalMin(value = "1.0", message = "Amount must be at least 1")
            BigDecimal guaranteedAmount
    ) {}

    public record GuarantorResponse(
            UUID id,
            UUID guarantorMemberId,
            String guarantorName,
            String guarantorMemberNumber,
            BigDecimal guaranteedAmount,
            String status
    ) {}
}