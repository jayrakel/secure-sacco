package com.jaytechwave.sacco.modules.assets.domain.entity;

/**
 * Lifecycle status of a SACCO-owned asset.
 *
 * <p>Transitions:
 * <pre>
 *   ACTIVE → UNDER_MAINTENANCE → ACTIVE
 *   ACTIVE | UNDER_MAINTENANCE → DISPOSED (terminal)
 *   ACTIVE | UNDER_MAINTENANCE → WRITTEN_OFF (terminal)
 * </pre>
 *
 * <p>DISPOSED and WRITTEN_OFF are terminal — no further transitions are allowed.
 * Physical deletion of asset records is NEVER permitted (ANTIGRAVITY_RULES.md §7).
 */
public enum AssetStatus {

    /** Asset is in normal operational use. */
    ACTIVE,

    /** Asset is temporarily out of service for repairs or servicing. */
    UNDER_MAINTENANCE,

    /** Asset has been retired and sold or scrapped. Terminal state. */
    DISPOSED,

    /** Asset has been written off the books due to loss, damage, or obsolescence. Terminal state. */
    WRITTEN_OFF;

    /** Returns true if this status is a terminal state (no further transitions allowed). */
    public boolean isTerminal() {
        return this == DISPOSED || this == WRITTEN_OFF;
    }
}
