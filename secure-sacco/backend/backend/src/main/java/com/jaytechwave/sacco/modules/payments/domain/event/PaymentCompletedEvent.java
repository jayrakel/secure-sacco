package com.jaytechwave.sacco.modules.payments.domain.event;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentCompletedEvent(
        UUID paymentId,
        UUID memberId,
        BigDecimal amount,
        String accountReference,
        String receiptNumber
) {}