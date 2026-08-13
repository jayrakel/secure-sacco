package com.jaytechwave.sacco.modules.accounting.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.IncomeStatementDTOs.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IncomeStatementService {

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public IncomeStatementResponse getIncomeStatement() {
        String sql = """
            SELECT
                a.account_code,
                a.account_name,
                a.account_type,
                COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) AS net_balance
            FROM accounts a
            LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
            LEFT JOIN journal_entries      je  ON je.id = jel.journal_entry_id
                AND je.status = 'POSTED'
            WHERE a.is_active = true AND a.account_type IN ('REVENUE', 'EXPENSE')
            GROUP BY a.id, a.account_code, a.account_name, a.account_type
            ORDER BY a.account_code
            """;

        List<AccountBalance> allLines = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    BigDecimal balance = rs.getBigDecimal("net_balance");
                    String type = rs.getString("account_type");
                    // Revenue normally has negative (credit) balance, make it positive for display
                    if ("REVENUE".equals(type)) {
                        balance = balance.negate();
                    }
                    return new AccountBalance(
                            rs.getString("account_code"),
                            rs.getString("account_name"),
                            balance,
                            type
                    );
                }
        );

        List<AccountBalance> revenues = allLines.stream().filter(l -> "REVENUE".equals(l.accountType())).toList();
        List<AccountBalance> expenses = allLines.stream().filter(l -> "EXPENSE".equals(l.accountType())).toList();

        BigDecimal totalRevenue = revenues.stream().map(AccountBalance::balance).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalExpenses = expenses.stream().map(AccountBalance::balance).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netIncome = totalRevenue.subtract(totalExpenses);

        return new IncomeStatementResponse(
                totalRevenue,
                totalExpenses,
                netIncome,
                revenues,
                expenses
        );
    }
}
