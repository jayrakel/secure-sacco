package com.jaytechwave.sacco.modules.reports.domain.service;

import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.FinancialOverviewDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementItemDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.MemberMiniSummaryDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.LoanArrearsDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.DailyCollectionDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementResponseDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementSummaryDTO;
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

    @Transactional(readOnly = true)
    public MemberMiniSummaryDTO getMySummary(UUID memberId) {
        MemberMiniSummaryDTO summary = new MemberMiniSummaryDTO();

        overviewRepository.findById(memberId).ifPresent(overview -> {
            summary.setSavingsBalance(overview.getTotalSavings() != null ? overview.getTotalSavings() : BigDecimal.ZERO);
            summary.setLoanArrears(overview.getLoanArrears() != null ? overview.getLoanArrears() : BigDecimal.ZERO);
            summary.setPenaltyOutstanding(overview.getPenaltyOutstanding() != null ? overview.getPenaltyOutstanding() : BigDecimal.ZERO);
        });

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
                    'Savings ' || st.type AS description,
                    1 AS txn_order
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
                    'Disbursed - ' || COALESCE(lp.name, 'Loan') AS description,
                    0 AS txn_order
                FROM loan_applications la
                LEFT JOIN loan_products lp ON la.loan_product_id = lp.id
                WHERE la.member_id = ? AND la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED', 'CLOSED', 'REFINANCED', 'RESTRUCTURED')
                
                UNION ALL
                
                SELECT 
                    lr.created_at AS transaction_date,
                    'LOANS' AS module,
                    'REPAYMENT' AS transaction_type,
                    lr.amount AS amount,
                    lr.receipt_number AS reference,
                    'Repayment - ' || COALESCE(lp.name, 'Loan') AS description,
                    2 AS txn_order
                FROM loan_repayments lr
                JOIN loan_applications la ON lr.loan_application_id = la.id
                LEFT JOIN loan_products lp ON la.loan_product_id = lp.id
                WHERE la.member_id = ? AND lr.status = 'COMPLETED' AND la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED', 'CLOSED', 'REFINANCED', 'RESTRUCTURED')
                
                UNION ALL
                
                SELECT 
                    p.created_at AS transaction_date,
                    'PENALTIES' AS module,
                    'ACCRUAL' AS transaction_type,
                    p.original_amount AS amount,
                    p.id::varchar AS reference,
                    'Penalty Applied' AS description,
                    1 AS txn_order
                FROM penalties p
                WHERE p.member_id = ?
                
                UNION ALL
                
                SELECT 
                    prp.created_at AS transaction_date,
                    'PENALTIES' AS module,
                    'REPAYMENT' AS transaction_type,
                    prp.amount AS amount,
                    prp.receipt_number AS reference,
                    'Penalty Repayment' AS description,
                    2 AS txn_order
                FROM penalty_repayments prp
                WHERE prp.member_id = ? AND prp.status = 'COMPLETED'
            ) AS combined
            ORDER BY transaction_date ASC, txn_order ASC
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
    public StatementResponseDTO getMemberStatementWithSummary(UUID memberId, String fromDate, String toDate) {
        List<StatementItemDTO> items = getMemberStatement(memberId, fromDate, toDate);
        StatementSummaryDTO summary = new StatementSummaryDTO();

        try {
            String loanSql = """
                SELECT 
                    COALESCE(outstanding_principal, 0) AS outstanding_principal,
                    COALESCE(outstanding_interest, 0) AS outstanding_interest
                FROM v_member_loan_summary
                WHERE member_id = ?
                """;

            jdbcTemplate.queryForObject(loanSql, (rs, rowNum) -> {
                BigDecimal principal = rs.getBigDecimal("outstanding_principal");
                BigDecimal interest = rs.getBigDecimal("outstanding_interest");
                summary.setLoanOutstanding(
                        principal.add(interest != null ? interest : BigDecimal.ZERO)
                );
                return null;
            }, memberId);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            summary.setLoanOutstanding(BigDecimal.ZERO);
        }

        String activeLoanStatsSql = """
            SELECT 
                COALESCE((SELECT SUM(principal_amount) FROM loan_applications WHERE member_id = ? AND status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')), 0) as total_disbursed,
                COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr JOIN loan_applications la ON lr.loan_application_id = la.id WHERE la.member_id = ? AND la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED') AND lr.status = 'COMPLETED'), 0) as total_repaid
            """;

        jdbcTemplate.queryForObject(activeLoanStatsSql, (rs, rowNum) -> {
            summary.setLoanDisbursed(rs.getBigDecimal("total_disbursed"));
            summary.setLoanRepaid(rs.getBigDecimal("total_repaid"));
            return null;
        }, memberId, memberId);

        for (StatementItemDTO item : items) {
            if ("SAVINGS".equals(item.getModule())) {
                if ("DEPOSIT".equals(item.getType())) {
                    summary.setSavingsDeposited(summary.getSavingsDeposited().add(item.getAmount()));
                } else if ("WITHDRAWAL".equals(item.getType())) {
                    summary.setSavingsWithdrawn(summary.getSavingsWithdrawn().add(item.getAmount()));
                }
            } else if ("PENALTIES".equals(item.getModule())) {
                if ("ACCRUAL".equals(item.getType())) {
                    summary.setPenaltiesCharged(summary.getPenaltiesCharged().add(item.getAmount()));
                } else if ("REPAYMENT".equals(item.getType()) || "WAIVER".equals(item.getType())) {
                    summary.setPenaltiesPaid(summary.getPenaltiesPaid().add(item.getAmount()));
                }
            }
        }

        overviewRepository.findById(memberId).ifPresent(overview -> {
            BigDecimal actualOutstanding = overview.getPenaltyOutstanding() != null
                    ? overview.getPenaltyOutstanding()
                    : BigDecimal.ZERO;

            BigDecimal statementCharged = summary.getPenaltiesCharged();
            BigDecimal statementPaid = summary.getPenaltiesPaid();

            if (statementCharged.compareTo(actualOutstanding) > 0) {
                BigDecimal hiddenPayments = statementCharged.subtract(actualOutstanding);
                if (hiddenPayments.compareTo(statementPaid) > 0) {
                    statementPaid = hiddenPayments;
                    summary.setPenaltiesPaid(statementPaid);
                }
            }

            BigDecimal trueCharged = actualOutstanding.add(statementPaid);
            summary.setPenaltiesCharged(trueCharged);
            summary.setPenaltiesOutstanding(actualOutstanding);
        });

        StatementResponseDTO response = new StatementResponseDTO();
        response.setItems(items);
        response.setSummary(summary);
        return response;
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

            if (days <= 7) dto.setBucket("1-7 Days");
            else if (days <= 30) dto.setBucket("8-30 Days");
            else if (days <= 60) dto.setBucket("31-60 Days");
            else if (days <= 90) dto.setBucket("61-90 Days");
            else dto.setBucket("90+ Days");

            return dto;
        });

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

        String channelSql = """
                SELECT payment_method, SUM(amount) AS total
                FROM (
                    SELECT payment_method, amount
                    FROM payments
                    WHERE CAST(created_at AS DATE) = CAST(? AS DATE) AND status = 'COMPLETED'
                    
                    UNION ALL
                    
                    SELECT 'MANUAL_ENTRY' AS payment_method, amount
                    FROM loan_repayments
                    WHERE CAST(created_at AS DATE) = CAST(? AS DATE) AND status = 'COMPLETED'

                    UNION ALL

                    -- SAC-254: Mini-statement credits that have no matching payments record
                    SELECT 'MPESA_COOP_MINI' AS payment_method, amount
                    FROM coop_transactions
                    WHERE source = 'MINI_STATEMENT'
                      AND transaction_type = 'CR'
                      AND CAST(created_at AS DATE) = CAST(? AS DATE)
                      AND NOT EXISTS (
                          SELECT 1 FROM payments p WHERE p.mpesa_ref = coop_transactions.mpesa_ref
                      )
                ) AS combined
                GROUP BY payment_method
                """;
        jdbcTemplate.query(channelSql, rs -> {
            dto.getByChannel().put(rs.getString("payment_method"), rs.getBigDecimal("total"));
        }, targetDate, targetDate, targetDate);

        String typeSql = """
                SELECT payment_type, SUM(amount) AS total
                FROM (
                    SELECT payment_type, amount
                    FROM payments
                    WHERE CAST(created_at AS DATE) = CAST(? AS DATE) AND status = 'COMPLETED'
                    
                    UNION ALL
                    
                    SELECT 'LOAN_REPAYMENT' AS payment_type, amount
                    FROM loan_repayments
                    WHERE CAST(created_at AS DATE) = CAST(? AS DATE) AND status = 'COMPLETED'

                    UNION ALL

                    -- SAC-254: Mini-statement credits that have no matching payments record
                    SELECT 'MINI_STATEMENT_CREDIT' AS payment_type, amount
                    FROM coop_transactions
                    WHERE source = 'MINI_STATEMENT'
                      AND transaction_type = 'CR'
                      AND CAST(created_at AS DATE) = CAST(? AS DATE)
                      AND NOT EXISTS (
                          SELECT 1 FROM payments p WHERE p.mpesa_ref = coop_transactions.mpesa_ref
                      )
                ) AS combined
                GROUP BY payment_type
                """;
        jdbcTemplate.query(typeSql, rs -> {
            dto.getByType().put(rs.getString("payment_type"), rs.getBigDecimal("total"));
        }, targetDate, targetDate, targetDate);

        BigDecimal grandTotal = dto.getByChannel().values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setTotalCollected(grandTotal);

        return dto;
    }

    // --- DRILLDOWN: Individual payment rows for the Daily Collections report ---
    @Transactional(readOnly = true)
    public List<com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.PaymentLineDTO> getDailyCollectionLines(String dateStr) {
        String targetDate = (dateStr == null || dateStr.isBlank())
                ? java.time.LocalDate.now().toString()
                : dateStr;

        // 🟢 THE FIX: Bulletproof extraction matching exactly on reference codes AND time!
        String sql = """
                SELECT * FROM (
                    SELECT
                        p.id::text,
                        COALESCE(NULLIF(TRIM(p.transaction_ref), ''), NULLIF(TRIM(ct.coop_transaction_id), '')) AS transaction_ref,
                        COALESCE(
                            NULLIF(TRIM(p.mpesa_ref), ''),
                            -- Intelligently pull the true M-Pesa receipt based on the event source
                            CASE WHEN ct.source = 'STK_CALLBACK' THEN NULLIF(TRIM(ct.coop_transaction_id), '')
                                 ELSE NULLIF(TRIM(ct.mpesa_ref), '') END
                        ) AS mpesa_ref,
                        p.internal_ref,
                        p.amount,
                        p.payment_method,
                        p.payment_type,
                        p.account_reference,
                        COALESCE(
                            NULLIF(TRIM(ct.sender_name), ''),
                            CASE WHEN mem.id IS NOT NULL THEN mem.first_name || ' ' || mem.last_name ELSE NULL END,
                            CASE WHEN NULLIF(TRIM(p.sender_name), '') IS NOT NULL AND p.sender_name NOT LIKE 'AccountRef%' AND LENGTH(p.sender_name) > 3 THEN p.sender_name ELSE NULL END
                        ) AS sender_name,
                        COALESCE(
                            CASE WHEN LENGTH(REGEXP_REPLACE(ct.sender_phone, '[^0-9]', '', 'g')) >= 9 THEN ct.sender_phone ELSE NULL END,
                            CASE WHEN LENGTH(REGEXP_REPLACE(p.sender_phone_number, '[^0-9]', '', 'g')) >= 9 THEN p.sender_phone_number ELSE NULL END
                        ) AS sender_phone_number,
                        p.status,
                        p.created_at
                    FROM payments p
                    LEFT JOIN LATERAL (
                        SELECT *
                        FROM coop_transactions
                        WHERE (coop_transaction_id = p.transaction_ref AND NULLIF(TRIM(p.transaction_ref), '') IS NOT NULL)
                           OR (mpesa_ref = p.internal_ref AND NULLIF(TRIM(p.internal_ref), '') IS NOT NULL)
                           OR (mpesa_ref = p.transaction_ref AND NULLIF(TRIM(p.transaction_ref), '') IS NOT NULL)
                           OR (coop_transaction_id = p.internal_ref AND NULLIF(TRIM(p.internal_ref), '') IS NOT NULL)
                           -- The Ultimate Fallback: Match by EXACT Amount & Time Window
                           OR (
                               amount = p.amount 
                               AND p.payment_method LIKE 'MPESA%'
                               AND p.transaction_type = 'CR'
                               AND ABS(EXTRACT(EPOCH FROM (created_at - p.created_at))) < 600 -- Within 10 mins
                           )
                        ORDER BY 
                            CASE WHEN coop_transaction_id = p.transaction_ref THEN 1
                                 WHEN mpesa_ref = p.internal_ref THEN 2
                                 WHEN mpesa_ref = p.transaction_ref THEN 3
                                 WHEN coop_transaction_id = p.internal_ref THEN 4
                                 ELSE 5 END ASC,
                            created_at DESC
                        LIMIT 1
                    ) ct ON true
                    LEFT JOIN members mem ON p.member_id = mem.id AND mem.is_deleted = false
                    WHERE CAST(p.created_at AS DATE) = CAST(? AS DATE)
                      AND p.status = 'COMPLETED'

                    UNION ALL

                    SELECT
                        lr.id::text,
                        NULL                                                        AS transaction_ref,
                        NULL                                                        AS mpesa_ref,
                        lr.receipt_number                                           AS internal_ref,
                        lr.amount,
                        'MANUAL_ENTRY'                                              AS payment_method,
                        'LOAN_REPAYMENT'                                            AS payment_type,
                        COALESCE(m.member_number, CAST(la.member_id AS varchar))    AS account_reference,
                        COALESCE(u.first_name || ' ' || u.last_name, 'Manual Entry') AS sender_name,
                        NULL                                                        AS sender_phone_number,
                        lr.status,
                        lr.created_at
                    FROM loan_repayments lr
                    JOIN loan_applications la ON lr.loan_application_id = la.id
                    JOIN members m ON la.member_id = m.id
                    LEFT JOIN users u ON m.id = u.member_id
                    WHERE CAST(lr.created_at AS DATE) = CAST(? AS DATE)
                      AND lr.status = 'COMPLETED'
                    UNION ALL

                    -- SAC-254: Mini-statement credits with no matching payments record.
                    -- These are payments received via mini-statement polling where Co-op
                    -- never sent an IPN — they appear in coop_transactions but not payments.
                    -- For sender_name: prefer the IPN record's name (full name) over the
                    -- mini-statement's truncated version (e.g. "Na" instead of "Nathan Gesora").
                    SELECT
                        ct.id::text,
                        ct.mpesa_ref                                                AS transaction_ref,
                        ct.mpesa_ref                                                AS mpesa_ref,
                        ct.mpesa_ref                                                AS internal_ref,
                        ct.amount,
                        'MPESA_COOP_MINI'                                           AS payment_method,
                        'MINI_STATEMENT_CREDIT'                                     AS payment_type,
                        COALESCE(ct.account_reference, ct.mpesa_ref)                AS account_reference,
                        COALESCE(
                            -- Prefer IPN sender_name if it's longer (mini-statement truncates)
                            CASE WHEN ipn.sender_name IS NOT NULL
                                      AND LENGTH(ipn.sender_name) > COALESCE(LENGTH(ct.sender_name), 0)
                                 THEN ipn.sender_name
                                 ELSE NULLIF(TRIM(ct.sender_name), '') END,
                            CASE WHEN mem.id IS NOT NULL
                                 THEN mem.first_name || ' ' || mem.last_name END,
                            'Unknown Sender'
                        )                                                           AS sender_name,
                        ct.sender_phone                                             AS sender_phone_number,
                        'COMPLETED'                                                 AS status,
                        ct.created_at
                    FROM coop_transactions ct
                    LEFT JOIN coop_transactions ipn
                        ON ipn.mpesa_ref = ct.mpesa_ref AND ipn.source = 'IPN'
                    LEFT JOIN members mem ON ct.member_id = mem.id AND mem.is_deleted = false
                    WHERE ct.source = 'MINI_STATEMENT'
                      AND ct.transaction_type = 'CR'
                      AND CAST(ct.created_at AS DATE) = CAST(? AS DATE)
                      AND NOT EXISTS (
                          SELECT 1 FROM payments p WHERE p.mpesa_ref = ct.mpesa_ref
                      )

                ) AS combined
                ORDER BY created_at DESC
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            var dto = new com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.PaymentLineDTO();
            dto.setId(rs.getString("id"));
            dto.setTransactionRef(rs.getString("transaction_ref"));
            dto.setMpesaRef(rs.getString("mpesa_ref"));
            dto.setInternalRef(rs.getString("internal_ref"));
            dto.setAmount(rs.getBigDecimal("amount"));
            dto.setPaymentMethod(rs.getString("payment_method"));
            dto.setPaymentType(rs.getString("payment_type"));
            dto.setAccountReference(rs.getString("account_reference"));
            dto.setSenderName(rs.getString("sender_name"));
            dto.setSenderPhoneNumber(rs.getString("sender_phone_number"));
            dto.setStatus(rs.getString("status"));
            java.sql.Timestamp ts = rs.getTimestamp("created_at");
            if (ts != null) {
                dto.setCreatedAt(ts.toLocalDateTime()
                        .format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            }
            return dto;
        }, targetDate, targetDate, targetDate);
    }

    @Transactional(readOnly = true)
    public com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.IncomeReportDTO getIncomeReport(String fromDateStr, String toDateStr) {
        var report = new com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.IncomeReportDTO();
        report.setFromDate(fromDateStr);
        report.setToDate(toDateStr);

        StringBuilder sql = new StringBuilder("""
            SELECT
                a.account_name AS category,
                SUM(jel.credit_amount - jel.debit_amount) AS total_income
            FROM journal_entry_lines jel
            JOIN accounts a ON jel.account_id = a.id
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE a.account_type = 'REVENUE'
              AND je.status = 'POSTED'
            """);

        java.util.List<Object> params = new java.util.ArrayList<>();

        if (fromDateStr != null && !fromDateStr.isBlank()) {
            sql.append(" AND je.transaction_date >= CAST(? AS DATE)");
            params.add(fromDateStr);
        }
        if (toDateStr != null && !toDateStr.isBlank()) {
            sql.append(" AND je.transaction_date <= CAST(? AS DATE)");
            params.add(toDateStr);
        }

        sql.append(" GROUP BY a.account_name ORDER BY total_income DESC");

        List<com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.IncomeCategoryDTO> categories = jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            var cat = new com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.IncomeCategoryDTO();
            cat.setCategory(rs.getString("category"));
            cat.setAmount(rs.getBigDecimal("total_income"));
            return cat;
        }, params.toArray());

        BigDecimal grandTotal = BigDecimal.ZERO;
        for (var cat : categories) {
            if(cat.getAmount() != null) {
                grandTotal = grandTotal.add(cat.getAmount());
            }
        }

        report.setCategories(categories);
        report.setTotalIncome(grandTotal);

        return report;
    }
}