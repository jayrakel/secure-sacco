package com.jaytechwave.sacco.modules.dividends.domain.repository;

import com.jaytechwave.sacco.modules.dividends.domain.entity.DividendDistribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DividendDistributionRepository extends JpaRepository<DividendDistribution, UUID> {
    List<DividendDistribution> findByDeclarationId(UUID declarationId);
    List<DividendDistribution> findByMemberIdOrderByCreatedAtDesc(UUID memberId);
}
