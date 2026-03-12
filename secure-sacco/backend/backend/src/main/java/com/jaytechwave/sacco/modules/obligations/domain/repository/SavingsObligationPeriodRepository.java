package com.jaytechwave.sacco.modules.obligations.domain.repository;

import com.jaytechwave.sacco.modules.obligations.domain.entity.PeriodStatus;
import com.jaytechwave.sacco.modules.obligations.domain.entity.SavingsObligationPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavingsObligationPeriodRepository extends JpaRepository<SavingsObligationPeriod, UUID> {

    List<SavingsObligationPeriod> findByObligationId(UUID obligationId);

    List<SavingsObligationPeriod> findByObligationIdAndStatus(UUID obligationId, PeriodStatus status);

    Optional<SavingsObligationPeriod> findByObligationIdAndPeriodStart(UUID obligationId, LocalDate periodStart);

    /**
     * Finds all OVERDUE periods for a given member, joining through the obligation.
     */
    @Query("""
        SELECT p FROM SavingsObligationPeriod p
        JOIN p.obligation o
        WHERE o.memberId = :memberId AND p.status = 'OVERDUE'
        ORDER BY p.periodStart DESC
        """)
    List<SavingsObligationPeriod> findOverdueByMemberId(@Param("memberId") UUID memberId);

    /**
     * Counts overdue periods per member for the compliance report.
     */
    @Query("""
        SELECT o.memberId, COUNT(p), SUM(p.requiredAmount - p.paidAmount)
        FROM SavingsObligationPeriod p
        JOIN p.obligation o
        WHERE p.status = 'OVERDUE'
        GROUP BY o.memberId
        """)
    List<Object[]> findOverdueSummaryPerMember();
}