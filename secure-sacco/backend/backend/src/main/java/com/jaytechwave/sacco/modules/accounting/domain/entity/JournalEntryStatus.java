package com.jaytechwave.sacco.modules.accounting.domain.entity;

public enum JournalEntryStatus {
    DRAFT,      // Saved but not yet affecting balances
    POSTED,     // Locked and actively affecting balances
    REVERSED    // Voided (usually by generating an inverse journal entry)
}