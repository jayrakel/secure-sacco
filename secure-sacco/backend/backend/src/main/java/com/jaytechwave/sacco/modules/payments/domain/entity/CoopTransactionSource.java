package com.jaytechwave.sacco.modules.payments.domain.entity;

public enum CoopTransactionSource {
    IPN,            // Co-op CBS pushed to /coop/ipn
    STK_CALLBACK,   // Member completed STK push → /coop/stk-callback
    MINI_STATEMENT  // Polled from Co-op mini-statement API
}