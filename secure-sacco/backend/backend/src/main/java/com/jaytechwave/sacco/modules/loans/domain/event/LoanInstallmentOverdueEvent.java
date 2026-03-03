package com.jaytechwave.sacco.modules.loans.domain.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record LoanInstallmentOverdueEvent(
        UUID loanApplicationId,
        UUID scheduleItemId,
        BigDecimal shortfallAmount,
        LocalDate dueDate
) {}