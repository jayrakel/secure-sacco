package com.jaytechwave.sacco.modules.payments.api.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * SAC-267: unified manual payment recording — lets a staff member with
 * MANUAL_PAYMENT_POST record a cash payment for any module through one
 * wizard, instead of needing a separate screen per module.
 */
public class ManualPaymentDTOs {

    public enum ManualPaymentType { SAVINGS, PENALTY, LOAN, CUSTOM }

    /** SAC-268/269: where the money is actually coming from for this payment. */
    public enum FundingSource {
        CASH,                          // new money received right now (or cheque/EFT etc.)
        SAVINGS_TRANSFER,              // member already had this in savings — withdraw and apply it instead
        HISTORICAL_TRANSACTION_REDUCTION // a SPECIFIC past savings deposit was recorded too high — shrink it
                                          // by this amount and redirect the difference, rather than creating
                                          // a brand new withdrawal. Use when the member never actually had
                                          // that money available separately — it was always meant for this.
    }

    /**
     * Step 2 of the wizard ("select payment type") needs to know, for THIS
     * specific member, which penalties are open and which custom products
     * exist — so the dropdowns in steps 3 are populated correctly.
     */
    public record ManualPaymentContext(
            BigDecimal savingsBalance, // so the wizard can show "Available: KES X" before a savings transfer
            List<RecentDepositOption> recentDeposits, // for HISTORICAL_TRANSACTION_REDUCTION's picker
            List<OpenPenaltyOption> openPenalties,
            boolean hasActiveLoan,
            BigDecimal loanOutstandingBalance,
            List<CustomProductOption> customProducts
    ) {}

    public record RecentDepositOption(
            UUID transactionId,
            BigDecimal amount,
            String reference,
            java.time.LocalDateTime postedAt
    ) {}

    public record OpenPenaltyOption(
            UUID penaltyId,
            String ruleName,
            BigDecimal outstandingAmount
    ) {}

    public record CustomProductOption(
            UUID productId,
            String name,
            String code
    ) {}

    public record ManualPaymentRequest(
            @NotNull UUID memberId,
            @NotNull ManualPaymentType paymentType,
            FundingSource fundingSource, // defaults to CASH if omitted — ignored when paymentType = SAVINGS
            UUID sourceTransactionId,    // required when fundingSource = HISTORICAL_TRANSACTION_REDUCTION

            // PENALTY: specific penalty id, or null + payAllPenalties=true to pay all open ones oldest-first
            UUID targetPenaltyId,
            Boolean payAllPenalties,

            // CUSTOM: required when paymentType = CUSTOM
            UUID customProductId,

            @NotNull BigDecimal amount,
            String channel,          // defaults to CASH
            String externalReference, // e.g. receipt/cheque number, optional
            String notes
    ) {}

    public record ManualPaymentResponse(
            String paymentType,
            String targetDescription,  // e.g. "Late Payment Penalty", "All open penalties", "Meat Contribution"
            BigDecimal amountPosted,
            BigDecimal remainingBalance, // outstanding penalty/loan balance after this payment, where applicable
            String reference
    ) {}
}