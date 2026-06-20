package com.jaytechwave.sacco.modules.paymentproducts.domain.repository;

import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.AllocationStatus;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.DepositAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DepositAllocationRepository extends JpaRepository<DepositAllocation, UUID> {

    List<DepositAllocation> findByPaymentId(UUID paymentId);

    List<DepositAllocation> findByPaymentIdAndStatus(UUID paymentId, AllocationStatus status);

    boolean existsByPaymentId(UUID paymentId);
}