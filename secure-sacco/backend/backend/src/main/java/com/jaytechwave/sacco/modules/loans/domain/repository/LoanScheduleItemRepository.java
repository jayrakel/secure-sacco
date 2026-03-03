package com.jaytechwave.sacco.modules.loans.domain.repository;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface LoanScheduleItemRepository extends JpaRepository<LoanScheduleItem, UUID> {
    List<LoanScheduleItem> findByLoanApplicationIdOrderByWeekNumberAsc(UUID loanApplicationId);

    List<LoanScheduleItem> findByDueDateBeforeAndStatusIn(LocalDate date, List<LoanScheduleStatus> statuses);
}