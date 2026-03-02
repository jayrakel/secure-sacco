package com.jaytechwave.sacco.modules.accounting.domain.repository;

import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import com.jaytechwave.sacco.modules.accounting.domain.entity.AccountType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByAccountCode(String accountCode);
    List<Account> findByAccountType(AccountType accountType);
    List<Account> findByIsActiveTrue();
    boolean existsByAccountCode(String accountCode);
}