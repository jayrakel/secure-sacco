package com.jaytechwave.sacco.modules.core.setup;

/**
 * Represents the current phase of the one-time system initialization flow.
 *
 * <p>Phase order (stateless — computed from live DB state on every request):
 * <ol>
 *   <li>{@link #CHANGE_PASSWORD}  — admin still has the seeded default password</li>
 *   <li>{@link #VERIFY_CONTACT}   — admin's email or phone is not yet verified</li>
 *   <li>{@link #CREATE_OFFICERS}  — required officer roles have no assigned users</li>
 *   <li>{@link #CONFIGURE_PLATFORM} — SACCO settings row has not been initialized</li>
 *   <li>{@link #COMPLETE}         — all steps done; system is live</li>
 * </ol>
 */
public enum SetupPhase {
    CHANGE_PASSWORD,
    VERIFY_CONTACT,
    CREATE_OFFICERS,
    CONFIGURE_PLATFORM,
    COMPLETE
}