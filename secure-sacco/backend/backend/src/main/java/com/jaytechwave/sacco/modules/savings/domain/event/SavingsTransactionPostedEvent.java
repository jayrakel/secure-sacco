package com.jaytechwave.sacco.modules.savings.domain.event;

import com.jaytechwave.sacco.modules.savings.domain.entity.TransactionType;

import java.math.BigDecimal;
import java.util.UUID;

public record SavingsTransactionPostedEvent(
        UUID memberId,
        UUID savingsAccountId,
        TransactionType type,
        BigDecimal amount,
        String reference
) {}
