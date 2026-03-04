package com.jaytechwave.sacco.modules.penalties.domain.repository;

import com.jaytechwave.sacco.modules.penalties.domain.entity.Penalty;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PenaltyRepository extends JpaRepository<Penalty, UUID> {

    List<Penalty> findByStatus(PenaltyStatus status);

    List<Penalty> findByMemberIdAndStatusOrderByCreatedAtAsc(UUID memberId, PenaltyStatus status);
}