package com.jaytechwave.sacco.modules.loans.domain.entity;

public enum LoanStatus {
    DRAFT,
    PENDING_FEE,
    PENDING_GUARANTORS,
    PENDING_PROCESSING_FEE,
    PENDING_VERIFICATION, // Loans officer review
    PENDING_APPROVAL,     // Committee review
    PENDING_NOMINATION,   // Waiting for disbursement member nomination
    PENDING_DISBURSEMENT_APPROVAL, // Waiting for 3-party approval
    APPROVED,             // Ready for disbursement
    DISBURSED,            // Cheque issued, awaiting bank clearance
    REJECTED,
    IN_GRACE,
    ACTIVE,               // Cheque cleared
    CLOSED,               // Fully paid
    DEFAULTED,
    REFINANCED,   // loan was topped-up
    RESTRUCTURED
}