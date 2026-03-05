package com.jaytechwave.sacco.modules.reports.domain.service;

import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.FinancialOverviewDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementItemDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.MemberMiniSummaryDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.LoanArrearsDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.DailyCollectionDTO;
import com.jaytechwave.sacco.modules.reports.domain.repository.MemberFinancialOverviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final MemberFinancialOverviewRepository overviewRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public List<FinancialOverviewDTO> getMemberFinancialOverview() {
        return overviewRepository.findAll().stream().map(entity -> {
            FinancialOverviewDTO dto = new FinancialOverviewDTO();
            dto.setMemberId(entity.getMemberId());
            dto.setMemberNumber(entity.getMemberNumber());
            dto.setFirstName(entity.getFirstName());
            dto.setLastName(entity.getLastName());
            dto.setTotalSavings(entity.getTotalSavings());
            dto.setLoanPrincipal(entity.getLoanPrincipal());
            dto.setLoanInterest(entity.getLoanInterest());
            dto.setLoanArrears(entity.getLoanArrears());
            dto.setLoanCredit(entity.getLoanCredit());
            dto.setPenaltyOutstanding(entity.getPenaltyOutstanding());
            return dto;
        }).collect(Collectors.toList());
    }

    // --- NEW: MINI SUMMARY WIDGET ENGINE ---
    @Transactional(readOnly = true)
    public MemberMiniSummaryDTO getMySummary(UUID memberId) {
        MemberMiniSummaryDTO summary = new MemberMiniSummaryDTO();

        // 1. Fetch live balances perfectly from our Read Model View
        overviewRepository.findById(memberId).ifPresent(overview -> {
            summary.setSavingsBalance(overview.getTotalSavings() != null ? overview.getTotalSavings() : BigDecimal.ZERO);
            summary.setLoanArrears(overview.getLoanArrears() != null ? overview.getLoanArrears() : BigDecimal.ZERO);
            summary.setPenaltyOutstanding(overview.getPenaltyOutstanding() != null ? overview.getPenaltyOutstanding() : BigDecimal.ZERO);
        });

        // 2. Fetch specific Next Due Date and Active Loan Status via ultra-fast subquery
        String sql = """
            SELECT 
                la.status AS loan_status,
                (SELECT MIN(due_date) FROM loan_schedule_items WHERE loan_application_id = la.id AND status != 'PAID') AS next_due_date
            FROM loan_applications la
            WHERE la.member_id = ? AND la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')
            LIMIT 1
            """;

        try {
            jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
                summary.setActiveLoanStatus(rs.getString("loan_status"));
                java.sql.Date date = rs.getDate("next_due_date");
                if (date != null) {
                    summary.setNextDueDate(date.toLocalDate().toString());
                }
                return null;
            }, memberId);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            // No active loan, which perfectly defaults activeLoanStatus to "NONE"
            summary.setActiveLoanStatus("NONE");
        }

        return summary;
    }

    @Transactional(readOnly = true)
    public List<StatementItemDTO> getMemberStatement(UUID memberId, String fromDate, String toDate) {
        String sql = """
            SELECT * FROM (
                SELECT 
                    st.created_at AS transaction_date,
                    'SAVINGS' AS module,
                    st.type AS transaction_type,
                    st.amount AS amount,
                    st.reference AS reference,
                    'Savings ' || st.type AS description
                FROM savings_transactions st
                JOIN savings_accounts sa ON st.savings_account_id = sa.id
                WHERE sa.member_id = ? AND st.status = 'POSTED'
                
                UNION ALL
                
                SELECT 
                    la.created_at AS transaction_date,
                    'LOANS' AS module,
                    'DISBURSEMENT' AS transaction_type,
                    la.principal_amount AS amount,
                    la.id::varchar AS reference,
                    'Loan Disbursement' AS description
                FROM loan_applications la
                WHERE la.member_id = ? AND la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED', 'CLOSED')
                
                UNION ALL
                
                SELECT 
                    lr.created_at AS transaction_date,
                    'LOANS' AS module,
                    'REPAYMENT' AS transaction_type,
                    lr.amount AS amount,
                    lr.receipt_number AS reference,
                    'Loan Repayment' AS description
                FROM loan_repayments lr
                JOIN loan_applications la ON lr.loan_application_id = la.id
                WHERE la.member_id = ? AND lr.status = 'COMPLETED'
                
                UNION ALL
                
                SELECT 
                    p.created_at AS transaction_date,
                    'PENALTIES' AS module,
                    'ACCRUAL' AS transaction_type,
                    p.original_amount AS amount,
                    p.id::varchar AS reference,
                    'Penalty Applied' AS description
                FROM penalties p
                WHERE p.member_id = ?
                
                UNION ALL
                
                SELECT 
                    prp.created_at AS transaction_date,
                    'PENALTIES' AS module,
                    'REPAYMENT' AS transaction_type,
                    prp.amount AS amount,
                    prp.receipt_number AS reference,
                    'Penalty Repayment' AS description
                FROM penalty_repayments prp
                WHERE prp.member_id = ? AND prp.status = 'COMPLETED'
            ) AS combined
            ORDER BY transaction_date DESC
            """;

        List<StatementItemDTO> results = jdbcTemplate.query(sql, (rs, rowNum) -> {
            StatementItemDTO dto = new StatementItemDTO();
            Timestamp ts = rs.getTimestamp("transaction_date");
            if (ts != null) {
                dto.setDate(ts.toLocalDateTime().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            }
            dto.setModule(rs.getString("module"));
            dto.setType(rs.getString("transaction_type"));
            dto.setAmount(rs.getBigDecimal("amount"));
            dto.setReference(rs.getString("reference"));
            dto.setDescription(rs.getString("description"));
            return dto;
        }, memberId, memberId, memberId, memberId, memberId);

        // Date Window Filtering
        if (fromDate != null && !fromDate.isEmpty()) {
            LocalDateTime from = LocalDateTime.parse(fromDate, DateTimeFormatter.ISO_DATE_TIME);
            results = results.stream().filter(r -> LocalDateTime.parse(r.getDate()).isAfter(from)).collect(Collectors.toList());
        }
        if (toDate != null && !toDate.isEmpty()) {
            LocalDateTime to = LocalDateTime.parse(toDate, DateTimeFormatter.ISO_DATE_TIME);
            results = results.stream().filter(r -> LocalDateTime.parse(r.getDate()).isBefore(to)).collect(Collectors.toList());
        }

        return results;
    }

    @Transactional(readOnly = true)
    public List<LoanArrearsDTO> getLoanArrearsReport(String bucketFilter) {
        String sql = """
            SELECT 
                m.member_number,
                u.first_name,
                u.last_name,
                la.id AS loan_id,
                p.name AS product_name,
                SUM(lsi.principal_due + lsi.interest_due - lsi.principal_paid - lsi.interest_paid) AS amount_overdue,
                MAX(CURRENT_DATE - CAST(lsi.due_date AS DATE)) AS days_overdue
            FROM loan_schedule_items lsi
            JOIN loan_applications la ON lsi.loan_application_id = la.id
            JOIN members m ON la.member_id = m.id
            JOIN users u ON m.id = u.member_id
            JOIN loan_products p ON la.loan_product_id = p.id
            WHERE lsi.due_date < CURRENT_DATE
              AND lsi.status != 'PAID'
              AND la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')
            GROUP BY m.member_number, u.first_name, u.last_name, la.id, p.name
            ORDER BY days_overdue DESC
            """;

        List<LoanArrearsDTO> results = jdbcTemplate.query(sql, (rs, rowNum) -> {
            var dto = new LoanArrearsDTO();
            dto.setMemberNumber(rs.getString("member_number"));
            dto.setMemberName(rs.getString("first_name") + " " + rs.getString("last_name"));
            dto.setLoanId(rs.getString("loan_id"));
            dto.setProductName(rs.getString("product_name"));
            dto.setAmountOverdue(rs.getBigDecimal("amount_overdue"));

            int days = rs.getInt("days_overdue");
            dto.setDaysOverdue(days);

            // Standard Banking Aging Buckets
            if (days <= 7) dto.setBucket("1-7 Days");
            else if (days <= 30) dto.setBucket("8-30 Days");
            else if (days <= 60) dto.setBucket("31-60 Days");
            else if (days <= 90) dto.setBucket("61-90 Days");
            else dto.setBucket("90+ Days");

            return dto;
        });

        // Optionally filter by bucket if the endpoint requested it
        if (bucketFilter != null && !bucketFilter.isBlank()) {
            return results.stream()
                    .filter(r -> r.getBucket().equalsIgnoreCase(bucketFilter))
                    .collect(Collectors.toList());
        }

        return results;
    }

    @Transactional(readOnly = true)
    public DailyCollectionDTO getDailyCollections(String dateStr) {
        String targetDate = (dateStr == null || dateStr.isBlank())
                ? java.time.LocalDate.now().toString()
                : dateStr;

        DailyCollectionDTO dto = new DailyCollectionDTO();
        dto.setDate(targetDate);

        // 1. Group by Payment Method (MPESA, BANK_TRANSFER, etc.)
        String channelSql = """
                SELECT payment_method, SUM(amount) AS total
                FROM payments
                WHERE CAST(created_at AS DATE) = CAST(? AS DATE) AND status = 'COMPLETED'
                GROUP BY payment_method
                """;
        jdbcTemplate.query(channelSql, rs -> {
            dto.getByChannel().put(rs.getString("payment_method"), rs.getBigDecimal("total"));
        }, targetDate);

        // 2. Group by Payment Type (C2B, STK_PUSH, B2C, etc.)
        String typeSql = """
                SELECT payment_type, SUM(amount) AS total
                FROM payments
                WHERE CAST(created_at AS DATE) = CAST(? AS DATE) AND status = 'COMPLETED'
                GROUP BY payment_type
                """;
        jdbcTemplate.query(typeSql, rs -> {
            dto.getByType().put(rs.getString("payment_type"), rs.getBigDecimal("total"));
        }, targetDate);

        // 3. Calculate Grand Total
        BigDecimal grandTotal = dto.getByChannel().values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setTotalCollected(grandTotal);

        return dto;
    }
}