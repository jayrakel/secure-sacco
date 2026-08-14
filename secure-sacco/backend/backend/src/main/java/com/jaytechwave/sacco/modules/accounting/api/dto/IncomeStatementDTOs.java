package com.jaytechwave.sacco.modules.accounting.api.dto;

import java.math.BigDecimal;
import java.util.List;

public class IncomeStatementDTOs {

    public record IncomeStatementResponse(
            BigDecimal totalRevenue,
            BigDecimal totalExpenses,
            BigDecimal netIncome,
            List<AccountBalance> revenues,
            List<AccountBalance> expenses
    ) {}

    public record AccountBalance(
            String accountCode,
            String accountName,
            BigDecimal balance,
            String accountType
    ) {}
}
