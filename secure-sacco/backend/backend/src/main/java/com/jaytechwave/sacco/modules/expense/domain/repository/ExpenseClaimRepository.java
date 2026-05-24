package com.jaytechwave.sacco.modules.expense.domain.repository;

import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaim;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseClaimRepository extends JpaRepository<ExpenseClaim, UUID> {

    /** Returns all claims submitted by a specific member, newest first. */
    List<ExpenseClaim> findByMemberIdOrderByCreatedAtDesc(UUID memberId);

    /** Returns all claims matching the given status, newest first. */
    List<ExpenseClaim> findByStatusOrderByCreatedAtDesc(ExpenseClaimStatus status);

    /** Returns all claims across all members, newest first — used for the staff view. */
    List<ExpenseClaim> findAllByOrderByCreatedAtDesc();
}
