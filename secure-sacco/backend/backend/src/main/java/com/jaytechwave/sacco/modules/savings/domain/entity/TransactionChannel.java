package com.jaytechwave.sacco.modules.savings.domain.entity;

public enum TransactionChannel {
    CASH,
    MPESA,
    INTERNAL,
    /** Bank-to-bank electronic funds transfer (e.g. Equity → Co-op) */
    EFT,
    /** PESALINK instant inter-bank transfer */
    PESALINK,
    /** Real-time gross settlement for large value transfers */
    RTGS,
    /** Physical cheque deposited at the bank */
    CHEQUE
}