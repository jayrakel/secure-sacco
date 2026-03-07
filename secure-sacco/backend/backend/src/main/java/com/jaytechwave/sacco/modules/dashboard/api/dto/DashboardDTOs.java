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

    @Data
    public static class MemberDashboardDTO implements Serializable {
        private static final long serialVersionUID = 1L;

        private String memberName;
        private String memberNumber;
        private String memberStatus;
        private String registrationStatus;

        private BigDecimal savingsBalance = BigDecimal.ZERO;
        private BigDecimal totalDeposited = BigDecimal.ZERO;
        private BigDecimal totalWithdrawn = BigDecimal.ZERO;

        private Integer activeLoans = 0;
        private BigDecimal totalLoanOutstanding = BigDecimal.ZERO;

        private BigDecimal nextInstallmentAmount;
        private String nextInstallmentDueDate;

        private Integer openPenalties = 0;
        private BigDecimal totalPenaltiesOutstanding = BigDecimal.ZERO;

        private Integer upcomingMeetings = 0;
        private Integer attendanceRate = 0;
    }
}