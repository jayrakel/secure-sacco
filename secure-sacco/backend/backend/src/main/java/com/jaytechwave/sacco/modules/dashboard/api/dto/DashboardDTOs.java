package com.jaytechwave.sacco.modules.dashboard.api.dto;

import lombok.Data;
import java.io.Serializable;
import java.math.BigDecimal;

public class DashboardDTOs {

    @Data
    public static class StaffDashboardDTO implements Serializable {
        private static final long serialVersionUID = 1L;

        // Members
        private Integer totalMembers          = 0;
        private Integer activeMembers         = 0;
        private Integer pendingActivations    = 0;

        // Savings — frontend reads: data.totalSavings
        private BigDecimal totalSavings       = BigDecimal.ZERO;

        // Loans — frontend reads: data.loanPortfolio, data.loansInArrears, data.pendingLoanApplications
        private Integer activeLoans           = 0;
        private BigDecimal loanPortfolio      = BigDecimal.ZERO;
        private Integer loansInArrears        = 0;
        private BigDecimal totalArrearsAmount = BigDecimal.ZERO;
        private Integer pendingLoanApplications = 0;

        // Penalties — frontend reads: data.openPenalties, data.outstandingPenalties
        private Integer openPenalties         = 0;
        private BigDecimal outstandingPenalties = BigDecimal.ZERO;

        // Collections — frontend reads: data.todaysCollections (MPESA + manual combined)
        private BigDecimal todaysCollections  = BigDecimal.ZERO;

        // Meetings
        private Integer upcomingMeetings      = 0;
        private Integer meetingsThisMonth     = 0;
    }

    @Data
    public static class MemberDashboardDTO implements Serializable {
        private static final long serialVersionUID = 1L;

        // Identity
        private String memberName;
        private String memberNumber;
        private String memberStatus;
        private String registrationStatus;

        // Savings
        private BigDecimal savingsBalance     = BigDecimal.ZERO;
        private BigDecimal totalDeposited     = BigDecimal.ZERO;
        private BigDecimal totalWithdrawn     = BigDecimal.ZERO;

        // Loans — frontend reads: data.loanOutstanding
        private Integer activeLoans           = 0;
        private BigDecimal loanOutstanding    = BigDecimal.ZERO;

        // Next installment
        private BigDecimal nextInstallmentAmount;
        private String     nextInstallmentDueDate;

        // Penalties — frontend reads: data.openPenaltiesCount, data.openPenaltiesAmount
        private Integer    openPenaltiesCount  = 0;
        private BigDecimal openPenaltiesAmount = BigDecimal.ZERO;

        // Meeting — frontend reads all four fields
        private Integer upcomingMeetings        = 0;
        private String  upcomingMeetingId;
        private String  upcomingMeetingTitle;
        private String  upcomingMeetingStartAt;
        private String  upcomingMeetingStatus;

        // Attendance
        private Integer attendanceRate = 0;
    }
}