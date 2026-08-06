package com.jaytechwave.sacco.modules.payments.domain.event;

import java.math.BigDecimal;
import java.util.UUID;

public record NonMemberPaymentReceivedEvent(
        UUID paymentId,
        BigDecimal amount,
        String senderPhone,
        String senderName,
        String mpesaRef
) {}
