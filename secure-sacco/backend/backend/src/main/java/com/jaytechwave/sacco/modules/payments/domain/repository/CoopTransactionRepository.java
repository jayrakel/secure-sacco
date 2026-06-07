package com.jaytechwave.sacco.modules.payments.domain.repository;

import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransactionSource;
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

    Optional<CoopTransaction> findByMpesaRef(String mpesaRef);

    /** All transactions newest first — for the dashboard card */
    Page<CoopTransaction> findAllByOrderByValueDateDesc(Pageable pageable);

    /** Filter by date range */
    @Query("SELECT t FROM CoopTransaction t " +
            "WHERE t.valueDate BETWEEN :from AND :to " +
            "ORDER BY t.valueDate DESC")
    Page<CoopTransaction> findBetween(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to,
            Pageable pageable);

    /** Credits not yet applied to savings — for reconciliation job */
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