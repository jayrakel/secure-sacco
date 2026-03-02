package com.jaytechwave.sacco.modules.savings.domain.repository;

import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavingsTransactionRepository extends JpaRepository<SavingsTransaction, UUID> {
    List<SavingsTransaction> findBySavingsAccountIdOrderByCreatedAtDesc(UUID savingsAccountId);
    Optional<SavingsTransaction> findByReference(String reference);
}