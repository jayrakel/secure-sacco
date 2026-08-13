package com.jaytechwave.sacco.modules.accounting.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreateFinancialYearRequest(
        @NotBlank(message = "Year name is required")
        String yearName,
        
        @NotNull(message = "Start date is required")
        LocalDate startDate,
        
        @NotNull(message = "End date is required")
        LocalDate endDate
) {}
