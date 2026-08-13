package com.jaytechwave.sacco.modules.accounting.api.controller;

import com.jaytechwave.sacco.modules.accounting.api.dto.BalanceSheetDTOs.*;
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
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/accounting/balance-sheet")
@RequiredArgsConstructor
@Tag(name = "Accounting", description = "Balance Sheet reporting")
public class BalanceSheetController {

    private final JdbcTemplate jdbcTemplate;

    @Operation(summary = "Get Balance Sheet", description = "Returns the Statement of Financial Position.")
    @GetMapping
    @PreAuthorize("hasAuthority('GL_BALANCE_SHEET')")
    public ResponseEntity<BalanceSheetResponse> getBalanceSheet(
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
                COALESCE(SUM(jel.credit_amount), 0) AS total_credits
            FROM accounts a
            LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
            LEFT JOIN journal_entries      je  ON je.id = jel.journal_entry_id
                AND je.status = 'POSTED'
                AND je.transaction_date <= ?
            WHERE a.is_active = true
            GROUP BY a.id, a.account_code, a.account_name, a.account_type
            ORDER BY a.account_code
            """;

        List<RawAccountData> rawData = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new RawAccountData(
                        rs.getString("account_code"),
                        rs.getString("account_name"),
                        rs.getString("account_type"),
                        rs.getBigDecimal("total_debits"),
                        rs.getBigDecimal("total_credits")
                ),
                effectiveDate
        );

        List<AccountBalanceDTO> assets = new ArrayList<>();
        List<AccountBalanceDTO> liabilities = new ArrayList<>();
        List<AccountBalanceDTO> equity = new ArrayList<>();

        BigDecimal totalAssets = BigDecimal.ZERO;
        BigDecimal totalLiabilities = BigDecimal.ZERO;
        BigDecimal totalEquity = BigDecimal.ZERO;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;

        for (RawAccountData data : rawData) {
            BigDecimal debits = data.debits;
            BigDecimal credits = data.credits;

            switch (data.type) {
                case "ASSET" -> {
                    BigDecimal bal = debits.subtract(credits);
                    if (bal.compareTo(BigDecimal.ZERO) != 0) {
                        assets.add(new AccountBalanceDTO(data.code, data.name, bal));
                        totalAssets = totalAssets.add(bal);
                    }
                }
                case "LIABILITY" -> {
                    BigDecimal bal = credits.subtract(debits);
                    if (bal.compareTo(BigDecimal.ZERO) != 0) {
                        liabilities.add(new AccountBalanceDTO(data.code, data.name, bal));
                        totalLiabilities = totalLiabilities.add(bal);
                    }
                }
                case "EQUITY" -> {
                    BigDecimal bal = credits.subtract(debits);
                    if (bal.compareTo(BigDecimal.ZERO) != 0) {
                        equity.add(new AccountBalanceDTO(data.code, data.name, bal));
                        totalEquity = totalEquity.add(bal);
                    }
                }
                case "REVENUE" -> {
                    BigDecimal bal = credits.subtract(debits);
                    totalRevenue = totalRevenue.add(bal);
                }
                case "EXPENSE" -> {
                    BigDecimal bal = debits.subtract(credits);
                    totalExpense = totalExpense.add(bal);
                }
            }
        }

        BigDecimal netIncome = totalRevenue.subtract(totalExpense);
        
        // Add Net Income to Equity as Retained Earnings
        equity.add(new AccountBalanceDTO("RETAINED-EARNINGS", "Retained Earnings (Net Income)", netIncome));
        totalEquity = totalEquity.add(netIncome);

        boolean isBalanced = totalAssets.compareTo(totalLiabilities.add(totalEquity)) == 0;

        SectionData assetsSection = new SectionData(assets, totalAssets);
        SectionData liabilitiesSection = new SectionData(liabilities, totalLiabilities);
        SectionData equitySection = new SectionData(equity, totalEquity);

        return ResponseEntity.ok(new BalanceSheetResponse(
                effectiveDate.toString(),
                assetsSection,
                liabilitiesSection,
                equitySection,
                netIncome,
                isBalanced
        ));
    }

    private record RawAccountData(String code, String name, String type, BigDecimal debits, BigDecimal credits) {}
}
