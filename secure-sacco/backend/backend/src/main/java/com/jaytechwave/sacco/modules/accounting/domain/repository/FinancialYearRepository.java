package com.jaytechwave.sacco.modules.accounting.domain.repository;

import com.jaytechwave.sacco.modules.accounting.domain.model.FinancialYear;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialYearRepository extends JpaRepository<FinancialYear, UUID> {
    Optional<FinancialYear> findByYearName(String yearName);
    Optional<FinancialYear> findByCurrentTrue();
}
