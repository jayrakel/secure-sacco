package com.jaytechwave.sacco.modules.loans.domain.repository;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, UUID> {
    List<LoanApplication> findByMemberIdOrderByCreatedAtDesc(UUID memberId);
    Optional<LoanApplication> findFirstByMemberIdAndStatusOrderByCreatedAtDesc(UUID memberId, LoanStatus status);
    List<LoanApplication> findByStatus(LoanStatus status);
    Page<LoanApplication> findByStatus(LoanStatus status, Pageable pageable);
    List<LoanApplication> findByPrepaymentBalanceGreaterThan(java.math.BigDecimal amount);
}