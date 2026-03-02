package com.jaytechwave.sacco.modules.payments.domain.event;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentFailedEvent(
        UUID paymentId,
        UUID memberId,
        BigDecimal amount,
        String accountReference,
        String failureReason
) {}