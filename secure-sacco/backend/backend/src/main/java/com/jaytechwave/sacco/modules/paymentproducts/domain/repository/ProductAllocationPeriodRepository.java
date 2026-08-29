package com.jaytechwave.sacco.modules.paymentproducts.domain.repository;

import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ProductAllocationPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductAllocationPeriodRepository extends JpaRepository<ProductAllocationPeriod, UUID> {

    Optional<ProductAllocationPeriod> findByProductIdAndMemberIdAndPeriodStart(UUID productId, UUID memberId, LocalDate periodStart);

    List<ProductAllocationPeriod> findByProductIdAndMemberIdOrderByPeriodStartDesc(UUID productId, UUID memberId);

    Optional<ProductAllocationPeriod> findFirstByProductIdAndMemberIdAndPeriodStartLessThanEqualAndPeriodEndGreaterThanEqual(UUID productId, UUID memberId, LocalDate date1, LocalDate date2);
}
