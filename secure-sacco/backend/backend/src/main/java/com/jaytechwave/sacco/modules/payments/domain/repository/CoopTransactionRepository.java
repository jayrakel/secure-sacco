package com.jaytechwave.sacco.modules.payments.domain.repository;

import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CoopTransactionRepository extends JpaRepository<CoopTransaction, UUID> {

    /** De-duplication check */
    boolean existsByMpesaRef(String mpesaRef);

    // SAC-256: Safe boolean check — avoids NonUniqueResultException if two records share
    // the same mpesaRef (IPN + mini-statement race). Returns true if ANY record for this
    // mpesaRef has savings_credited = true.
    boolean existsByMpesaRefAndSavingsCreditedIsTrue(String mpesaRef);

    Optional<CoopTransaction> findByMpesaRef(String mpesaRef);

    /**
     * Checks for a Co-op transaction whose ID starts with the given prefix.
     *
     * Needed because IPN and mini-statement use different Co-op transaction ID
     * formats for the same underlying transaction:
     *   IPN:            S28698461_09062026_2  (with date suffix)
     *   Mini-statement: S28698461             (without suffix)
     *
     * Using startsWith catches both formats so duplicate mini-statement entries
     * are not created when the IPN already stored the transaction.
     */
    @Query("SELECT COUNT(ct) > 0 FROM CoopTransaction ct WHERE ct.coopTransactionId LIKE :prefix%")
    boolean existsByCoopTransactionIdStartingWith(@Param("prefix") String prefix);

    /** All transactions newest first — for the dashboard card */
    Page<CoopTransaction> findAllByOrderByValueDateDesc(Pageable pageable);

    /**
     * Feed query for the dashboard Co-op transactions card.
     *
     * Sources:
     * - ALL IPN records (member M-Pesa deposits — have sender_name, phone, member_id)
     * - MINI_STATEMENT records with no IPN counterpart (DR transactions, unmatched POS)
     *
     * Ordering: COALESCE(value_date, transaction_date, created_at) DESC
     * - MINI_STATEMENT: value_date has exact time from the bank → used first
     * - IPN:            value_date is null (bank only sends a date, not a time)
     *                   → falls back to transaction_date which has the exact time
     * - Fallback:       created_at if both are null
     *
     * This is transparent — we never derive or overwrite value_date.
     */
    @Query(value = """
            SELECT ct.*
            FROM coop_transactions ct
            WHERE ct.source = 'IPN'
               OR (ct.source = 'MINI_STATEMENT'
                   AND NOT EXISTS (
                       SELECT 1 FROM coop_transactions ct2
                       WHERE ct2.mpesa_ref = ct.mpesa_ref
                         AND ct2.source = 'IPN'
                   ))
            ORDER BY COALESCE(ct.value_date, ct.transaction_date, ct.created_at) DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM coop_transactions ct
            WHERE ct.source = 'IPN'
               OR (ct.source = 'MINI_STATEMENT'
                   AND NOT EXISTS (
                       SELECT 1 FROM coop_transactions ct2
                       WHERE ct2.mpesa_ref = ct.mpesa_ref
                         AND ct2.source = 'IPN'
                   ))
            """,
            nativeQuery = true)
    Page<CoopTransaction> findFeedDeduped(Pageable pageable);

    /** Filter by date range */
    @Query("SELECT t FROM CoopTransaction t " +
            "WHERE t.valueDate BETWEEN :from AND :to " +
            "ORDER BY t.valueDate DESC")
    Page<CoopTransaction> findBetween(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to,
            Pageable pageable);

    /**
     * Credits not yet applied to savings — for reconciliation job.
     * Excludes CoopTransactions where a matching STK_PUSH payment already exists,
     * because those savings are handled by the DEP- listener path, not paybill path.
     */
    @Query(value = """
            SELECT ct.* FROM coop_transactions ct
            WHERE ct.savings_credited  = false
              AND ct.transaction_type  = 'CR'
              AND ct.member_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM payments p
                  WHERE (p.mpesa_ref = ct.mpesa_ref OR p.transaction_ref = ct.mpesa_ref)
                    AND p.payment_type = 'STK_PUSH'
                    AND p.status = 'COMPLETED'
              )
            """, nativeQuery = true)
    List<CoopTransaction> findUncreditedNonStkCredits();

    /** @deprecated Use {@link #findUncreditedNonStkCredits()} — this version does not exclude STK payments */
    @Deprecated
    List<CoopTransaction> findBySavingsCreditedFalseAndTransactionTypeAndMemberIdIsNotNull(
            String transactionType);

    /** All transactions for a member */
    Page<CoopTransaction> findByMemberIdOrderByValueDateDesc(UUID memberId, Pageable pageable);

    /** All transactions for a phone number */
    Page<CoopTransaction> findBySenderPhoneOrderByValueDateDesc(String phone, Pageable pageable);

    /**
     * All transactions where we have a phone number but no matched member yet.
     * Used by the re-enrichment job to retroactively link payments to members
     * who registered after the transaction was stored.
     */
    List<CoopTransaction> findByMemberIdIsNullAndSenderPhoneIsNotNull();
}