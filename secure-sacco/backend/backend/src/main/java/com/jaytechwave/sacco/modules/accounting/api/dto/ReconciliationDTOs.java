package com.jaytechwave.sacco.modules.accounting.api.dto;

import java.math.BigDecimal;
import java.util.List;

public class ReconciliationDTOs {

    public record InternalReconciliationResponse(
            String timestamp,
            List<ReconciliationLineDTO> savingsReconciliation,
            List<ReconciliationLineDTO> shareReconciliation,
            List<ReconciliationLineDTO> loanReconciliation
    ) {}

    public record ReconciliationLineDTO(
            String productName,
            String glAccountCode,
            String glAccountName,
            BigDecimal subLedgerBalance,
            BigDecimal glBalance,
            BigDecimal variance,
            boolean isReconciled
    ) {}
}
