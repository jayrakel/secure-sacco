package com.jaytechwave.sacco.modules.penalties.domain.repository;

import com.jaytechwave.sacco.modules.penalties.domain.entity.Penalty;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PenaltyRepository extends JpaRepository<Penalty, UUID> {

    List<Penalty> findByStatus(PenaltyStatus status);

    List<Penalty> findByMemberIdAndStatusOrderByCreatedAtAsc(UUID memberId, PenaltyStatus status);

    @Query("SELECT p FROM Penalty p JOIN FETCH p.penaltyRule WHERE p.status = :status")
    List<Penalty> findByStatusWithPenaltyRule(PenaltyStatus status);

    /** Find the penalty raised for a specific obligation period. */
    Optional<Penalty> findByReferenceTypeAndReferenceId(String referenceType, UUID referenceId);

    /** All open penalties for a member — used in compliance view. */
    List<Penalty> findByMemberIdAndStatus(UUID memberId, PenaltyStatus status);

    /**
     * Migration helper: detect an existing migrated penalty by exact member, amount,
     * referenceType and createdAt timestamp to avoid creating duplicates when
     * running the migration multiple times.
     */
    Optional<Penalty> findByMemberIdAndReferenceTypeAndOriginalAmountAndCreatedAt(UUID memberId,
                                                                                  String referenceType,
                                                                                  BigDecimal originalAmount,
                                                                                  LocalDateTime createdAt);
}