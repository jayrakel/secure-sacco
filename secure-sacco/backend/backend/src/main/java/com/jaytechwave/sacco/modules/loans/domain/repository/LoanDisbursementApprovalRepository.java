package com.jaytechwave.sacco.modules.loans.domain.repository;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanDisbursementApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanDisbursementApprovalRepository extends JpaRepository<LoanDisbursementApproval, UUID> {
    List<LoanDisbursementApproval> findByLoanApplicationId(UUID loanApplicationId);
    boolean existsByLoanApplicationIdAndApproverRole(UUID loanApplicationId, String approverRole);
}
