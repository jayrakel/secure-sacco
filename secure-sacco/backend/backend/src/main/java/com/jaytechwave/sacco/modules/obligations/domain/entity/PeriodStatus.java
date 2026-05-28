package com.jaytechwave.sacco.modules.obligations.domain.entity;

public enum PeriodStatus {
    /**
     * The savings deadline for this period has not yet arrived.
     * The member still has time to contribute. (Computed at API layer — not stored in DB.)
     */
    UPCOMING,

    /**
     * The savings deadline is today or has passed but grace hasn't ended.
     * Member should contribute now.
     */
    DUE,

    /**
     * Member has paid enough to satisfy the required amount for this period.
     */
    COVERED,

    /**
     * Deadline + grace days passed and the member did not meet the required amount.
     * A SAVINGS_MISSED_CONTRIBUTION penalty has been (or will be) created.
     */
    OVERDUE
}