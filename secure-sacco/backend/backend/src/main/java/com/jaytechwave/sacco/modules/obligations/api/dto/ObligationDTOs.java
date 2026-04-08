package com.jaytechwave.sacco.modules.obligations.api.dto;

import com.jaytechwave.sacco.modules.obligations.domain.entity.ObligationFrequency;
import com.jaytechwave.sacco.modules.obligations.domain.entity.ObligationStatus;
import com.jaytechwave.sacco.modules.obligations.domain.entity.PeriodStatus;
import com.jaytechwave.sacco.modules.obligations.domain.entity.SavingsObligation;
import com.jaytechwave.sacco.modules.obligations.domain.entity.SavingsObligationPeriod;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

public class ObligationDTOs {

    // ── Requests ──────────────────────────────────────────────────────────────

    @Data
    public static class CreateObligationRequest {
        @NotNull(message = "Member ID is required")
        private UUID memberId;

        @NotNull(message = "Frequency is required")
        private ObligationFrequency frequency;

        @NotNull(message = "Amount due is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        private BigDecimal amountDue;

        @NotNull(message = "Start date is required")
        private LocalDate startDate;

        @Min(value = 0, message = "Grace days cannot be negative")
        private int graceDays = 0;
    }

    /**
     * Partial update — all fields are optional so callers only send what they want to change.
     * Uses a record (immutable) consistent with the rest of the codebase's DTO style.
     */
    public record UpdateObligationRequest(
            @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
            BigDecimal amountDue,

            LocalDate startDate,

            @Min(value = 0, message = "Grace days cannot be negative")
            Integer graceDays
    ) {}

    @Data
    public static class UpdateObligationStatusRequest {
        @NotNull(message = "Status is required")
        private ObligationStatus status;
    }

    // ── Responses ─────────────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ObligationResponse {
        private UUID              id;
        private UUID              memberId;
        private ObligationFrequency frequency;
        private BigDecimal        amountDue;
        private LocalDate         startDate;
        private int               graceDays;
        private ObligationStatus  status;
        private ZonedDateTime     createdAt;

        /** Current or most recent period */
        private ObligationPeriodResponse currentPeriod;

        public static ObligationResponse from(SavingsObligation o) {
            return ObligationResponse.builder()
                    .id(o.getId())
                    .memberId(o.getMemberId())
                    .frequency(o.getFrequency())
                    .amountDue(o.getAmountDue())
                    .startDate(o.getStartDate())
                    .graceDays(o.getGraceDays())
                    .status(o.getStatus())
                    .createdAt(o.getCreatedAt())
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ObligationPeriodResponse {
        private UUID          id;
        private UUID          obligationId;
        private LocalDate     periodStart;
        private LocalDate     periodEnd;
        private BigDecimal    requiredAmount;
        private BigDecimal    paidAmount;
        private BigDecimal    remaining;
        private PeriodStatus  status;
        private ZonedDateTime createdAt;

        public static ObligationPeriodResponse from(SavingsObligationPeriod p) {
            BigDecimal remaining = p.getRequiredAmount().subtract(p.getPaidAmount()).max(BigDecimal.ZERO);
            return ObligationPeriodResponse.builder()
                    .id(p.getId())
                    .obligationId(p.getObligation().getId())
                    .periodStart(p.getPeriodStart())
                    .periodEnd(p.getPeriodEnd())
                    .requiredAmount(p.getRequiredAmount())
                    .paidAmount(p.getPaidAmount())
                    .remaining(remaining)
                    .status(p.getStatus())
                    .createdAt(p.getCreatedAt())
                    .build();
        }
    }

    /** One row in the staff compliance report table */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ObligationComplianceEntry {
        private UUID              memberId;
        private String            memberNumber;
        private String            memberName;
        private ObligationFrequency frequency;
        private BigDecimal        amountDue;
        private long              totalOverduePeriods;
        private BigDecimal        totalShortfall;
        private PeriodStatus      worstStatus;
    }
}