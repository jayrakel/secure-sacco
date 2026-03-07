package com.jaytechwave.sacco.modules.dashboard.domain.service;

import com.jaytechwave.sacco.modules.dashboard.api.dto.DashboardDTOs.StaffDashboardDTO;
import com.jaytechwave.sacco.modules.dashboard.api.dto.DashboardDTOs.MemberDashboardDTO;
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

    @Cacheable(value = "memberDashboard", key = "#identifier")
    @Transactional(readOnly = true)
    public MemberDashboardDTO getMemberDashboardMetrics(String identifier) {
        log.info("📊 Executing personal dashboard DB query for user: {}", identifier);

        String sql = """
            SELECT
                m.first_name, m.last_name,
                m.member_number,
                u.user_status AS member_status,
                m.status AS registration_status,

                COALESCE((SELECT vsb.total_savings_balance FROM v_member_savings_balance vsb WHERE vsb.member_id = m.id), 0) AS savings_balance,
                COALESCE((SELECT SUM(t.amount) FROM savings_transactions t JOIN savings_accounts sa ON t.savings_account_id = sa.id WHERE sa.member_id = m.id AND t.type = 'DEPOSIT' AND t.status = 'POSTED'), 0) AS total_deposited,
                COALESCE((SELECT SUM(t.amount) FROM savings_transactions t JOIN savings_accounts sa ON t.savings_account_id = sa.id WHERE sa.member_id = m.id AND t.type = 'WITHDRAWAL' AND t.status = 'POSTED'), 0) AS total_withdrawn,

                (SELECT COUNT(*) FROM loan_applications WHERE member_id = m.id AND status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')) AS active_loans,
                COALESCE((SELECT SUM(lsi.total_due - lsi.principal_paid - lsi.interest_paid) FROM loan_schedule_items lsi JOIN loan_applications la ON lsi.loan_application_id = la.id WHERE la.member_id = m.id AND la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')), 0) AS total_loan_outstanding,

                (SELECT lsi.total_due - lsi.principal_paid - lsi.interest_paid FROM loan_schedule_items lsi JOIN loan_applications la ON lsi.loan_application_id = la.id WHERE la.member_id = m.id AND lsi.status != 'PAID' AND la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED') ORDER BY lsi.due_date ASC LIMIT 1) AS next_installment_amount,
                (SELECT lsi.due_date FROM loan_schedule_items lsi JOIN loan_applications la ON lsi.loan_application_id = la.id WHERE la.member_id = m.id AND lsi.status != 'PAID' AND la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED') ORDER BY lsi.due_date ASC LIMIT 1) AS next_installment_due_date,

                (SELECT COUNT(*) FROM penalties WHERE member_id = m.id AND status = 'OPEN') AS open_penalties,
                COALESCE((SELECT SUM(outstanding_amount) FROM penalties WHERE member_id = m.id AND status = 'OPEN'), 0) AS total_penalties_outstanding,

                (SELECT COUNT(*) FROM meetings WHERE status = 'SCHEDULED' AND start_at >= CURRENT_TIMESTAMP) AS upcoming_meetings,
                COALESCE((SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE CAST((SUM(CASE WHEN ma.status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS INT) END FROM meeting_attendance ma WHERE ma.member_id = m.id), 0) AS attendance_rate

            FROM members m
            JOIN users u ON m.user_id = u.id
            WHERE u.email = ? OR u.phone_number = ?
        """;

        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
            MemberDashboardDTO dto = new MemberDashboardDTO();
            dto.setMemberName(rs.getString("first_name") + " " + rs.getString("last_name"));
            dto.setMemberNumber(rs.getString("member_number"));
            dto.setMemberStatus(rs.getString("member_status"));
            dto.setRegistrationStatus(rs.getString("registration_status"));

            dto.setSavingsBalance(rs.getBigDecimal("savings_balance"));
            dto.setTotalDeposited(rs.getBigDecimal("total_deposited"));
            dto.setTotalWithdrawn(rs.getBigDecimal("total_withdrawn"));

            dto.setActiveLoans(rs.getInt("active_loans"));
            dto.setTotalLoanOutstanding(rs.getBigDecimal("total_loan_outstanding"));

            dto.setNextInstallmentAmount(rs.getBigDecimal("next_installment_amount"));
            java.sql.Date dueDate = rs.getDate("next_installment_due_date");
            if (dueDate != null) {
                dto.setNextInstallmentDueDate(dueDate.toLocalDate().toString());
            }

            dto.setOpenPenalties(rs.getInt("open_penalties"));
            dto.setTotalPenaltiesOutstanding(rs.getBigDecimal("total_penalties_outstanding"));

            dto.setUpcomingMeetings(rs.getInt("upcoming_meetings"));
            dto.setAttendanceRate(rs.getInt("attendance_rate"));

            return dto;
        }, identifier, identifier);
    }
}