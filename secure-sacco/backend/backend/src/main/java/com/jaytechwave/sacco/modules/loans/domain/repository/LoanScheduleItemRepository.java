package com.jaytechwave.sacco.modules.loans.domain.repository;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanScheduleItemRepository extends JpaRepository<LoanScheduleItem, UUID> {
    List<LoanScheduleItem> findByLoanApplicationIdOrderByWeekNumberAsc(UUID loanApplicationId);
}