package com.jaytechwave.sacco.modules.penalties.domain.repository;

import com.jaytechwave.sacco.modules.penalties.domain.entity.Penalty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PenaltyRepository extends JpaRepository<Penalty, UUID> {}