package com.jaytechwave.sacco.modules.expense.domain.repository;

import com.jaytechwave.sacco.modules.expense.domain.entity.SaccoExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SaccoExpenseRepository extends JpaRepository<SaccoExpense, UUID> {
    List<SaccoExpense> findAllByOrderByCreatedAtDesc();
}
