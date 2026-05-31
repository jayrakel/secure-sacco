package com.jaytechwave.sacco.modules.penalties.domain.repository;

import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PenaltyRuleRepository extends JpaRepository<PenaltyRule, UUID> {
    Optional<PenaltyRule> findByCode(String code);
    Optional<PenaltyRule> findByName(String name);
    List<PenaltyRule> findByIsActiveTrue();

    @org.springframework.data.jpa.repository.Query(
            "SELECT COUNT(p) FROM Penalty p WHERE p.penaltyRule.id = :ruleId"
    )
    long countPenaltiesByRuleId(@org.springframework.data.repository.query.Param("ruleId") java.util.UUID ruleId);
}