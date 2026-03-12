package com.jaytechwave.sacco.modules.obligations.domain.repository;

import com.jaytechwave.sacco.modules.obligations.domain.entity.ObligationStatus;
import com.jaytechwave.sacco.modules.obligations.domain.entity.SavingsObligation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SavingsObligationRepository extends JpaRepository<SavingsObligation, UUID> {

    List<SavingsObligation> findByMemberId(UUID memberId);

    List<SavingsObligation> findByMemberIdAndStatus(UUID memberId, ObligationStatus status);

    List<SavingsObligation> findByStatus(ObligationStatus status);
}