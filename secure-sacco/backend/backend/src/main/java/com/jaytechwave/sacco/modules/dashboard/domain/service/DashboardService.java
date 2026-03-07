package com.jaytechwave.sacco.modules.dashboard.domain.service;

import com.jaytechwave.sacco.modules.dashboard.api.dto.DashboardDTOs.StaffDashboardDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final JdbcTemplate jdbcTemplate;

    @Cacheable(value = "staffDashboard", key = "'kpi'")
    @Transactional(readOnly = true)
    public StaffDashboardDTO getStaffDashboardMetrics() {
        log.info("📊 Executing heavy dashboard DB query (Redis Cache Miss)");

        String sql = """
            SELECT
                (SELECT COUNT(*) FROM members) AS total_members,
                (SELECT COUNT(*) FROM members WHERE status = 'ACTIVE') AS active_members,
                (SELECT COUNT(*) FROM members WHERE status = 'PENDING') AS pending_activations,

                COALESCE((SELECT SUM(total_savings_balance) FROM v_member_savings_balance), 0) AS total_savings_balance,

                (SELECT COUNT(*) FROM loan_applications WHERE status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')) AS active_loans,
                COALESCE((SELECT SUM(outstanding_principal) FROM v_member_loan_summary), 0) AS total_loan_portfolio,
                (SELECT COUNT(DISTINCT loan_application_id) FROM loan_schedule_items WHERE due_date < CURRENT_DATE AND status != 'PAID') AS loans_in_arrears,
                COALESCE((SELECT SUM(total_arrears) FROM v_member_loan_summary), 0) AS total_arrears_amount,
                (SELECT COUNT(*) FROM loan_applications WHERE status = 'PENDING_APPROVAL') AS pending_loan_applications,

                (SELECT COUNT(*) FROM penalties WHERE status = 'OPEN') AS open_penalties,
                COALESCE((SELECT SUM(outstanding_amount) FROM penalties WHERE status = 'OPEN'), 0) AS total_outstanding_penalties,

                COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'COMPLETED' AND CAST(created_at AS DATE) = CURRENT_DATE AND payment_method = 'MPESA'), 0) AS collections_today_mpesa,
                COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'COMPLETED' AND CAST(created_at AS DATE) = CURRENT_DATE AND payment_method IN ('CASH', 'BANK_TRANSFER')), 0) AS collections_today_manual,

                (SELECT COUNT(*) FROM meetings WHERE status = 'SCHEDULED' AND start_at >= CURRENT_TIMESTAMP) AS upcoming_meetings,
                (SELECT COUNT(*) FROM meetings WHERE EXTRACT(MONTH FROM start_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM start_at) = EXTRACT(YEAR FROM CURRENT_DATE)) AS meetings_this_month
        """;

        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
            StaffDashboardDTO dto = new StaffDashboardDTO();
            dto.setTotalMembers(rs.getInt("total_members"));
            dto.setActiveMembers(rs.getInt("active_members"));
            dto.setPendingActivations(rs.getInt("pending_activations"));
            dto.setTotalSavingsBalance(rs.getBigDecimal("total_savings_balance"));
            dto.setActiveLoans(rs.getInt("active_loans"));
            dto.setTotalLoanPortfolio(rs.getBigDecimal("total_loan_portfolio"));
            dto.setLoansInArrears(rs.getInt("loans_in_arrears"));
            dto.setTotalArrearsAmount(rs.getBigDecimal("total_arrears_amount"));
            dto.setPendingLoanApplications(rs.getInt("pending_loan_applications"));
            dto.setOpenPenalties(rs.getInt("open_penalties"));
            dto.setTotalOutstandingPenalties(rs.getBigDecimal("total_outstanding_penalties"));
            dto.setCollectionsTodayMpesa(rs.getBigDecimal("collections_today_mpesa"));
            dto.setCollectionsTodayManual(rs.getBigDecimal("collections_today_manual"));
            dto.setUpcomingMeetings(rs.getInt("upcoming_meetings"));
            dto.setMeetingsThisMonth(rs.getInt("meetings_this_month"));
            return dto;
        });
    }
}