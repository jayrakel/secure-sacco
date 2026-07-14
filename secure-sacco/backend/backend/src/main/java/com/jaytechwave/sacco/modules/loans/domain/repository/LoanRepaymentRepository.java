package com.jaytechwave.sacco.modules.loans.domain.repository;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanRepayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, UUID> {
	Optional<LoanRepayment> findByReceiptNumber(String receiptNumber);
	boolean existsByReceiptNumber(String receiptNumber);
}

// Added migration-friendly lookup to support idempotency checks
// (existsByReceiptNumber / findByReceiptNumber)

