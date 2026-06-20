package com.jaytechwave.sacco.modules.paymentproducts.domain.repository;

import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.AllocationStatus;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.DepositAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface DepositAllocationRepository extends JpaRepository<DepositAllocation, UUID> {

    List<DepositAllocation> findByPaymentId(UUID paymentId);

    List<DepositAllocation> findByPaymentIdAndStatus(UUID paymentId, AllocationStatus status);

    boolean existsByPaymentId(UUID paymentId);

    /**
     * Total amount a member has successfully routed toward a given product —
     * used to compute "paid so far" against a product's requiredAmount target
     * (e.g. "Meat Contribution: KES 2,000 each — paid 1,200, remaining 800").
     * Only ROUTED allocations count; PENDING/FAILED ones don't reduce the target.
     */
    @Query("""
            SELECT COALESCE(SUM(da.amount), 0)
            FROM DepositAllocation da
            WHERE da.product.id = :productId
              AND da.payment.memberId = :memberId
              AND da.status = 'ROUTED'
           """)
    BigDecimal sumRoutedAmountByProductAndMember(@Param("productId") UUID productId, @Param("memberId") UUID memberId);
}