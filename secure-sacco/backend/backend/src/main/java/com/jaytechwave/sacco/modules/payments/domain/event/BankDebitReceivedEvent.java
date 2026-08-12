package com.jaytechwave.sacco.modules.payments.domain.event;

import java.math.BigDecimal;

public record BankDebitReceivedEvent(
        java.util.UUID paymentId,
        BigDecimal amount,
        String narration,
        String reference
) {}
