package com.jaytechwave.sacco.modules.reports.domain.service;

import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementItemDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementResponseDTO;
import com.jaytechwave.sacco.modules.reports.domain.repository.MemberFinancialOverviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportService")
class ReportServiceTest {

    @Mock
    private MemberFinancialOverviewRepository overviewRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private ReportService reportService;

    private UUID memberId;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();
    }

    @Test
    @DisplayName("getMemberStatementWithSummary: accumulates DEPOSIT and EXPENSE_REIMBURSEMENT into savingsDeposited")
    void getMemberStatementWithSummary_accumulatesDepositsAndReimbursements() {
        StatementItemDTO depositItem = new StatementItemDTO();
        depositItem.setDate("2026-08-01T10:00:00");
        depositItem.setModule("SAVINGS");
        depositItem.setType("DEPOSIT");
        depositItem.setAmount(new BigDecimal("5000.00"));
        depositItem.setReference("DEP-100");
        depositItem.setDescription("Savings DEPOSIT");

        StatementItemDTO reimbItem = new StatementItemDTO();
        reimbItem.setDate("2026-08-05T12:00:00");
        reimbItem.setModule("SAVINGS");
        reimbItem.setType("EXPENSE_REIMBURSEMENT");
        reimbItem.setAmount(new BigDecimal("2500.00"));
        reimbItem.setReference("EXP-200");
        reimbItem.setDescription("Savings EXPENSE_REIMBURSEMENT");

        StatementItemDTO withdrawalItem = new StatementItemDTO();
        withdrawalItem.setDate("2026-08-10T14:00:00");
        withdrawalItem.setModule("SAVINGS");
        withdrawalItem.setType("WITHDRAWAL");
        withdrawalItem.setAmount(new BigDecimal("1000.00"));
        withdrawalItem.setReference("WTH-300");
        withdrawalItem.setDescription("Savings WITHDRAWAL");

        // Mock jdbcTemplate.query for getMemberStatement
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(depositItem, reimbItem, withdrawalItem));

        // Mock loan sql queryForObject calls
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(null);

        when(overviewRepository.findById(memberId)).thenReturn(Optional.empty());

        StatementResponseDTO response = reportService.getMemberStatementWithSummary(memberId, null, null);

        assertThat(response).isNotNull();
        assertThat(response.getItems()).hasSize(3);
        // savingsDeposited should be 5000.00 + 2500.00 = 7500.00
        assertThat(response.getSummary().getSavingsDeposited())
                .isEqualByComparingTo(new BigDecimal("7500.00"));
        // savingsWithdrawn should be 1000.00
        assertThat(response.getSummary().getSavingsWithdrawn())
                .isEqualByComparingTo(new BigDecimal("1000.00"));
    }
}
