package com.jaytechwave.sacco.modules.accounting.api.dto;

import java.math.BigDecimal;
import java.util.List;

public class BalanceSheetDTOs {

    public record BalanceSheetResponse(
            String asOfDate,
            SectionData assets,
            SectionData liabilities,
            SectionData equity,
            BigDecimal netIncome,
            boolean isBalanced
    ) {}

    public record SectionData(
            List<AccountBalanceDTO> accounts,
            BigDecimal totalBalance
    ) {}

    public record AccountBalanceDTO(
            String accountCode,
            String accountName,
            BigDecimal balance
    ) {}
}
