package com.jaytechwave.sacco.modules.admin.historicaledit.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * SAC-269: TEMPORARY module — see V92 migration comment. Everything in this
 * package should be deleted, in one shot, before go-live.
 */
public class HistoricalEditDTOs {

    public record SearchRequest(
            UUID memberId,
            LocalDate from,
            LocalDate to
    ) {}

    public record HistoricalTransactionItem(
            UUID transactionId,
            String type,        // DEPOSIT | WITHDRAWAL | EXPENSE_REIMBURSEMENT
            String channel,
            BigDecimal amount,
            String reference,
            String status,
            LocalDateTime postedAt,
            boolean linkedToJournalEntry // false means editing amount here won't auto-correct the GL — flagged, not blocked
    ) {}

    public record EditTransactionRequest(
            UUID transactionId,
            BigDecimal newAmount,   // null = leave unchanged
            LocalDateTime newPostedAt, // null = leave unchanged
            String newReference,    // null = leave unchanged
            String reason           // required — written to the audit log, not optional
    ) {}

    public record EditTransactionResponse(
            UUID transactionId,
            BigDecimal previousAmount,
            BigDecimal newAmount,
            String previousReference,
            String newReference,
            boolean glAdjusted,
            String message
    ) {}
}