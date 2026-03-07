package com.jaytechwave.sacco.modules.accounting.api.dto;

import java.math.BigDecimal;
import java.util.List;

public class TrialBalanceDTOs {

    public record AccountLineDTO(
            String accountCode,
            String accountName,
            String accountType,   // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
            BigDecimal totalDebits,
            BigDecimal totalCredits,
            BigDecimal netBalance  // totalDebits - totalCredits
    ) {}

    public record TrialBalanceResponse(
            String asOfDate,          // YYYY-MM-DD
            List<AccountLineDTO> lines,
            BigDecimal grandTotalDebits,
            BigDecimal grandTotalCredits,
            boolean balanced          // true when grandTotalDebits == grandTotalCredits
    ) {}
}