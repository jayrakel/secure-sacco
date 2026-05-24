package com.jaytechwave.sacco.modules.expense.domain.entity;

/**
 * Lifecycle states for an {@link ExpenseClaim}.
 *
 * <p>PENDING  → initial state after submission; awaiting staff review.
 * <p>APPROVED → approved by a Treasurer/Admin; triggers GL journal entry.
 * <p>REJECTED → rejected by a Treasurer/Admin; no financial impact.
 */
public enum ExpenseClaimStatus {
    PENDING,
    APPROVED,
    REJECTED
}
