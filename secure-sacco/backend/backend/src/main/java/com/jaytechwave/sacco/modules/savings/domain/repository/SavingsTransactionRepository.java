package com.jaytechwave.sacco.modules.savings.domain.repository;

import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavingsTransactionRepository extends JpaRepository<SavingsTransaction, UUID> {
    List<SavingsTransaction> findBySavingsAccountIdOrderByCreatedAtDesc(UUID savingsAccountId);

    List<SavingsTransaction> findBySavingsAccountIdOrderByCreatedAtAsc(UUID savingsAccountId);

    Optional<SavingsTransaction> findByReference(String reference);
    boolean existsByReference(String reference);

    @Query("SELECT COALESCE(SUM(CASE " +
            "WHEN t.type = 'DEPOSIT' THEN t.amount " +
            "WHEN t.type = 'EXPENSE_REIMBURSEMENT' THEN t.amount " +
            "WHEN t.type = 'WITHDRAWAL' THEN -t.amount " +
            "ELSE 0 END), 0) " +
            "FROM SavingsTransaction t WHERE t.savingsAccountId = :accountId AND t.status = 'POSTED'")
    BigDecimal calculateBalance(@Param("accountId") UUID accountId);

    /**
     * Sums DEPOSIT transaction amounts for a savings account within a date range.
     * Used by the obligation evaluation job to compute how much a member has saved
     * in a given period window. Only POSTED transactions are counted.
     */
    @Query("""
        SELECT COALESCE(SUM(t.amount), 0)
        FROM SavingsTransaction t
        WHERE t.savingsAccountId = :accountId
          AND t.type = 'DEPOSIT'
          AND t.status = 'POSTED'
          AND t.postedAt >= :from
          AND t.postedAt < :to
        """)
    BigDecimal sumDepositsBetween(
            @Param("accountId") UUID accountId,
            @Param("from") java.time.LocalDateTime from,
            @Param("to") java.time.LocalDateTime to);

    /**
     * Same as sumDepositsBetween but uses valueDate (when the payment was actually made)
     * instead of postedAt (when the system processed it).
     *
     * This is the correct method for compliance evaluation — a member who pays at
     * 11:58 PM on the deadline should not be penalised because the system processed
     * the transaction at 2 AM the following morning.
     *
     * Falls back to postedAt if valueDate is null (for older records without valueDate).
     */
    @Query("""
        SELECT COALESCE(SUM(t.amount), 0)
        FROM SavingsTransaction t
        WHERE t.savingsAccountId = :accountId
          AND t.type   = 'DEPOSIT'
          AND t.status = 'POSTED'
          AND COALESCE(t.valueDate, t.postedAt) >= :from
          AND COALESCE(t.valueDate, t.postedAt) < :to
        """)
    BigDecimal sumDepositsByValueDateBetween(
            @Param("accountId") UUID accountId,
            @Param("from") java.time.LocalDateTime from,
            @Param("to") java.time.LocalDateTime to);
}