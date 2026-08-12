package com.jaytechwave.sacco.modules.expense.domain.repository;

import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaimAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseClaimAllocationRepository extends JpaRepository<ExpenseClaimAllocation, UUID> {
    List<ExpenseClaimAllocation> findByExpenseClaimId(UUID expenseClaimId);
    void deleteByExpenseClaimId(UUID expenseClaimId);
}
