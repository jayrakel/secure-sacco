package com.jaytechwave.sacco.modules.audit.domain.entity;

/**
 * Outcome of an audited operation.
 *
 * <ul>
 *   <li>{@code SUCCESS} — action completed as intended</li>
 *   <li>{@code FAILURE} — action attempted but failed due to an error</li>
 *   <li>{@code DENIED}  — action blocked by authorization</li>
 * </ul>
 */
public enum AuditResult {
    SUCCESS,
    FAILURE,
    DENIED
}
