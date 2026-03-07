package com.jaytechwave.sacco.modules.dashboard.api.dto;

import lombok.Data;
import java.io.Serializable;
import java.math.BigDecimal;

public class DashboardDTOs {

    @Data
    public static class StaffDashboardDTO implements Serializable {
        private static final long serialVersionUID = 1L;

        private Integer totalMembers = 0;
        private Integer activeMembers = 0;
        private Integer pendingActivations = 0;

        private BigDecimal totalSavingsBalance = BigDecimal.ZERO;

        private Integer activeLoans = 0;
        private BigDecimal totalLoanPortfolio = BigDecimal.ZERO;
        private Integer loansInArrears = 0;
        private BigDecimal totalArrearsAmount = BigDecimal.ZERO;
        private Integer pendingLoanApplications = 0;

        private Integer openPenalties = 0;
        private BigDecimal totalOutstandingPenalties = BigDecimal.ZERO;

        private BigDecimal collectionsTodayMpesa = BigDecimal.ZERO;
        private BigDecimal collectionsTodayManual = BigDecimal.ZERO;

        private Integer upcomingMeetings = 0;
        private Integer meetingsThisMonth = 0;
    }
}