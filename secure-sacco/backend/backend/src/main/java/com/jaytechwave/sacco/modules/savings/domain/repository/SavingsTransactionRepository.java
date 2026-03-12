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

    @Query("SELECT COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE -t.amount END), 0) " +
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
}