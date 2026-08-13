package com.jaytechwave.sacco.modules.accounting.api.dto;

import java.time.LocalDate;
import java.util.UUID;

public record FinancialYearResponse(
        UUID id,
        String yearName,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        boolean isCurrent
) {}
