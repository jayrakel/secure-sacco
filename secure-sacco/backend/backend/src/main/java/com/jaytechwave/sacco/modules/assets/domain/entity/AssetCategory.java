package com.jaytechwave.sacco.modules.assets.domain.entity;

/**
 * Category of a SACCO-owned asset.
 *
 * <p>Each category maps to a specific GL account code in the Chart of Accounts.
 * The mapping determines which asset account is debited on acquisition.
 *
 * <pre>
 *   FURNITURE  → 1330 Furniture & Fittings
 *   EQUIPMENT  → 1320 Office Equipment
 *   COMPUTER   → 1340 Computers & Software
 *   VEHICLE    → 1320 Office Equipment (nearest fit; extend with 1350 if needed)
 *   OTHER      → 1300 Fixed Assets (parent / catch-all)
 * </pre>
 */
public enum AssetCategory {

    FURNITURE("1330"),
    EQUIPMENT("1320"),
    COMPUTER("1340"),
    VEHICLE("1320"),
    OTHER("1300");

    /** The GL account code that should be DEBITED when this asset is acquired. */
    private final String glAccountCode;

    AssetCategory(String glAccountCode) {
        this.glAccountCode = glAccountCode;
    }

    public String getGlAccountCode() {
        return glAccountCode;
    }
}
