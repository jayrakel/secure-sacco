package com.jaytechwave.sacco.modules.loans.domain.entity;

public enum LoanScheduleStatus {
    PENDING, // Future installment
    DUE,     // Due this week
    OVERDUE, // Missed the due date
    PAID     // Fully cleared
}