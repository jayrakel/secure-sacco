package com.jaytechwave.sacco.modules.payments.domain.repository;

import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByInternalRef(String internalRef);
    Optional<Payment> findByTransactionRef(String transactionRef);

    /** Secondary idempotency — same M-Pesa receipt = same payment regardless of Co-op's txId */
    boolean existsByMpesaRef(String mpesaRef);

    /**
     * Used by the re-enrich endpoint to detect CoopTransactions that belong to STK pushes.
     * STK savings are handled by SavingsPaymentListener via the DEP- path, not the paybill path.
     * Without this check, the re-enrich would double-credit savings for STK payments.
     */
    boolean existsByMpesaRefAndPaymentTypeAndStatus(String mpesaRef, String paymentType,
                                                    com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus status);

    // Used by IPN matching — find pending STK payments by phone
    List<Payment> findBySenderPhoneNumberAndStatus(String senderPhoneNumber, PaymentStatus status);

    // Used by PendingPaymentPollingJob to find all pending STK pushes
    List<Payment> findByStatusAndPaymentType(PaymentStatus status, String paymentType);

    /**
     * Member-facing split deposit history (SAC-262) — lets a member see the real status
     * of a split deposit they initiated: PENDING / COMPLETED / FAILED, with failureReason
     * if it failed (e.g. wrong PIN, insufficient funds, timeout). Scoped to accountReference
     * starting with "SPLIT-" so only split-deposit payments are returned, not every payment
     * the member has ever made.
     */
    @Query("""
            SELECT p FROM Payment p
            WHERE p.memberId = :memberId
              AND p.accountReference LIKE 'SPLIT-%'
            ORDER BY p.createdAt DESC
           """)
    List<Payment> findRecentSplitDepositsByMember(@Param("memberId") UUID memberId, Pageable pageable);

    // ── Co-op account transaction history (IPN-stored) ───────────────────────

    /** All COMPLETED payments between two dates, newest first — CR and DR */
    @Query("SELECT p FROM Payment p WHERE p.status = 'COMPLETED' " +
            "AND p.createdAt >= :from AND p.createdAt <= :to " +
            "ORDER BY p.createdAt DESC")
    Page<Payment> findCompletedBetween(
            @Param("from") ZonedDateTime from,
            @Param("to")   ZonedDateTime to,
            Pageable pageable);

    /** Latest N completed payments regardless of date — CR and DR */
    Page<Payment> findByStatusOrderByCreatedAtDesc(PaymentStatus status, Pageable pageable);
}