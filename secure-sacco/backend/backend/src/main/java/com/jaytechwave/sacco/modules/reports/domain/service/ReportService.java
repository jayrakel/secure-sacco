package com.jaytechwave.sacco.modules.reports.domain.service;

import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.FinancialOverviewDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementItemDTO;
import com.jaytechwave.sacco.modules.reports.domain.repository.MemberFinancialOverviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}