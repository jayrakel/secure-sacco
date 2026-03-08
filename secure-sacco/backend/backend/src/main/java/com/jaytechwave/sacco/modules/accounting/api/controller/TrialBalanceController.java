package com.jaytechwave.sacco.modules.accounting.api.controller;

import com.jaytechwave.sacco.modules.accounting.api.dto.TrialBalanceDTOs.AccountLineDTO;
import com.jaytechwave.sacco.modules.accounting.api.dto.TrialBalanceDTOs.TrialBalanceResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/accounting/trial-balance")
@RequiredArgsConstructor
@Tag(name = "Accounting", description = "General ledger journal entries and trial balance")
public class TrialBalanceController {

    private final JdbcTemplate jdbcTemplate;

    @Operation(summary = "Get trial balance", description = "Returns the GL trial balance as of a given date. Requires GL_TRIAL_BALANCE permission.")
    @GetMapping
    @PreAuthorize("hasAuthority('GL_TRIAL_BALANCE')")
    public ResponseEntity<TrialBalanceResponse> getTrialBalance(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate asOfDate
    ) {
        LocalDate effectiveDate = asOfDate != null ? asOfDate : LocalDate.now();

        String sql = """
            SELECT
                a.account_code,
                a.account_name,
                a.account_type,
                COALESCE(SUM(jel.debit_amount),  0) AS total_debits,
                COALESCE(SUM(jel.credit_amount), 0) AS total_credits,
                COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) AS net_balance
            FROM accounts a
            LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
            LEFT JOIN journal_entries      je  ON je.id = jel.journal_entry_id
                AND je.status = 'POSTED'
                AND je.transaction_date <= ?
            WHERE a.is_active = true
            GROUP BY a.id, a.account_code, a.account_name, a.account_type
            ORDER BY a.account_code
            """;

        List<AccountLineDTO> lines = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new AccountLineDTO(
                        rs.getString("account_code"),
                        rs.getString("account_name"),
                        rs.getString("account_type"),
                        rs.getBigDecimal("total_debits"),
                        rs.getBigDecimal("total_credits"),
                        rs.getBigDecimal("net_balance")
                ),
                effectiveDate
        );

        BigDecimal grandDebits  = lines.stream().map(AccountLineDTO::totalDebits).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal grandCredits = lines.stream().map(AccountLineDTO::totalCredits).reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean balanced = grandDebits.compareTo(grandCredits) == 0;

        return ResponseEntity.ok(new TrialBalanceResponse(
                effectiveDate.toString(),
                lines,
                grandDebits,
                grandCredits,
                balanced
        ));
    }
}