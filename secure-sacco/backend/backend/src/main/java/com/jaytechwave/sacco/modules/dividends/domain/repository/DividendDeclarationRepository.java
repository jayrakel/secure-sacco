package com.jaytechwave.sacco.modules.dividends.domain.repository;

import com.jaytechwave.sacco.modules.dividends.domain.entity.DividendDeclaration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DividendDeclarationRepository extends JpaRepository<DividendDeclaration, UUID> {
}
