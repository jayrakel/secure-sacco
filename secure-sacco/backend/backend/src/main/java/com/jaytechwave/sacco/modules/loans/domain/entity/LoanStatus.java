package com.jaytechwave.sacco.modules.loans.domain.entity;

public enum LoanStatus {
    DRAFT,
    PENDING_FEE,
    PENDING_GUARANTORS,
    PENDING_VERIFICATION, // Loans officer review
    PENDING_APPROVAL,     // Committee review
    APPROVED,             // Ready for disbursement
    REJECTED,
    ACTIVE,               // Disbursed
    CLOSED,               // Fully paid
    DEFAULTED
}