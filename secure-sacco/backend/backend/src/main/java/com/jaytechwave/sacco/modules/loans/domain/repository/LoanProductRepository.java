package com.jaytechwave.sacco.modules.loans.domain.repository;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanProductRepository extends JpaRepository<LoanProduct, UUID> {
    List<LoanProduct> findByIsActiveTrue();
}