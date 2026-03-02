package com.jaytechwave.sacco.modules.savings.domain.repository;

import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavingsAccountRepository extends JpaRepository<SavingsAccount, UUID> {
    Optional<SavingsAccount> findByMemberId(UUID memberId);
}