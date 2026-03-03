package com.jaytechwave.sacco.modules.loans.domain.repository;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanGuarantor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanGuarantorRepository extends JpaRepository<LoanGuarantor, UUID> {
    List<LoanGuarantor> findByLoanApplicationId(UUID loanApplicationId);
    List<LoanGuarantor> findByGuarantorMemberId(UUID guarantorMemberId);
}