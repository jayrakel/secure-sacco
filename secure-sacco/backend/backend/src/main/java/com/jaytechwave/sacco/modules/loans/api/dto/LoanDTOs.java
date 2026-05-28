package com.jaytechwave.sacco.modules.loans.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
            String purpose,

            String referenceNotes
    ) {}

    public record PayLoanFeeRequest(
            @NotBlank(message = "Phone number is required")
            String phoneNumber
    ) {}

    public record LoanApplicationResponse(
            UUID id,
            UUID memberId,
            String memberNumber,
            String memberName,
            UUID productId,
            String productName,
            BigDecimal interestRate,
            Integer termWeeks,
            Integer gracePeriodDays,
            BigDecimal principalAmount,
            BigDecimal applicationFee,
            Boolean applicationFeePaid,
            String status,
            String purpose,
            String referenceNotes,
            LocalDateTime createdAt,
            List<GuarantorResponse> guarantors
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

    public record ReviewLoanRequest(
            @NotBlank(message = "Review notes are required")
            String notes
    ) {}

    public record RepayLoanRequest(
            @NotBlank(message = "Phone number is required")
            String phoneNumber,

            @NotNull(message = "Amount is required")
            @DecimalMin(value = "1.0", message = "Amount must be at least 1")
            BigDecimal amount
    ) {}

    public record LoanRepaymentResponse(
            UUID id,
            UUID loanApplicationId,
            BigDecimal amount,
            BigDecimal principalAllocated,
            BigDecimal interestAllocated,
            BigDecimal prepaymentAllocated,
            String receiptNumber,
            String status
    ) {}

    public record LoanSummaryResponse(
            UUID applicationId,
            String productName,
            BigDecimal principalAmount,
            BigDecimal totalOutstanding,
            BigDecimal totalArrears,
            BigDecimal prepaymentCredit,
            java.time.LocalDate nextDueDate,
            BigDecimal nextDueAmount,
            String status
    ) {}

    public record ArrearsSummaryResponse(
            UUID loanApplicationId,
            UUID memberId,
            String memberName,
            String memberNumber,
            long daysInArrears,
            BigDecimal arrearsAmount
    ) {}

    public record RefinanceRequest(
            @NotNull(message = "Old loan ID is required")
            UUID oldLoanId,
            @NotBlank(message = "Loan product code is required")
            String loanProductCode,
            @NotNull(message = "Top-up amount is required")
            @DecimalMin(value = "0.0", message = "Top-up amount must be 0 or greater")
            BigDecimal topUpAmount,
            BigDecimal interestOverride,
            @NotNull(message = "New term weeks is required")
            @Min(value = 1, message = "New term weeks must be at least 1")
            Integer newTermWeeks,
            @NotBlank(message = "Reference number is required")
            String referenceNumber,
            java.time.LocalDate historicalDateOverride
    ) {}
}