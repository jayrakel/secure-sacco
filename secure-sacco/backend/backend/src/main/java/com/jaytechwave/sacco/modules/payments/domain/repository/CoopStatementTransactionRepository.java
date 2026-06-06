package com.jaytechwave.sacco.modules.payments.domain.repository;

import com.jaytechwave.sacco.modules.payments.domain.entity.CoopStatementTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CoopStatementTransactionRepository extends JpaRepository<CoopStatementTransaction, UUID> {

    /** Check if a transaction already exists — prevents duplicate inserts */
    boolean existsByTransactionId(String transactionId);

    /** Find existing transaction to avoid re-saving */
    Optional<CoopStatementTransaction> findByTransactionId(String transactionId);

    /** All transactions in date range, newest first */
    @Query("SELECT t FROM CoopStatementTransaction t " +
            "WHERE t.valueDate BETWEEN :from AND :to " +
            "ORDER BY t.valueDate DESC")
    Page<CoopStatementTransaction> findBetween(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to,
            Pageable pageable);

    /** Unreconciled credits only — for reconciliation panel */
    @Query("SELECT t FROM CoopStatementTransaction t " +
            "WHERE t.reconciled = false AND t.transactionType = 'CR' " +
            "ORDER BY t.valueDate DESC")
    List<CoopStatementTransaction> findUnreconciledCredits();

    /** All transactions for a specific member */
    Page<CoopStatementTransaction> findByMemberIdOrderByValueDateDesc(UUID memberId, Pageable pageable);

    /** All transactions by phone number */
    Page<CoopStatementTransaction> findBySenderPhoneOrderByValueDateDesc(String phone, Pageable pageable);

    /** Latest N transactions regardless of date */
    Page<CoopStatementTransaction> findAllByOrderByValueDateDesc(Pageable pageable);
}