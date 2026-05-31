package com.jaytechwave.sacco.modules.loans.domain.repository;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface LoanScheduleItemRepository extends JpaRepository<LoanScheduleItem, UUID> {
    List<LoanScheduleItem> findByLoanApplicationIdOrderByWeekNumberAsc(UUID loanApplicationId);

    List<LoanScheduleItem> findByDueDateBeforeAndStatusIn(LocalDate date, List<LoanScheduleStatus> statuses);

    List<LoanScheduleItem> findByStatusAndDueDateLessThanEqual(com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus status, java.time.LocalDate date);

    List<LoanScheduleItem> findByStatus(com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus status);

    /**
     * Bulk-update a single schedule item's financial fields directly in the DB.
     * Used by MigrationService to bypass Hibernate L1 cache timing issues
     * during the historical loan schedule override.
     */
    @Modifying
    @Query("UPDATE LoanScheduleItem s SET s.principalDue = :principal, s.interestDue = :interest, s.totalDue = :total WHERE s.id = :id")
    void updateAmounts(
            @Param("id") UUID id,
            @Param("principal") java.math.BigDecimal principal,
            @Param("interest") java.math.BigDecimal interest,
            @Param("total") java.math.BigDecimal total
    );
}