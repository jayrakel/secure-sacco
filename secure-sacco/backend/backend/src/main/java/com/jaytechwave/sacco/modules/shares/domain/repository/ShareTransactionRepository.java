package com.jaytechwave.sacco.modules.shares.domain.repository;

import com.jaytechwave.sacco.modules.shares.domain.entity.ShareTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ShareTransactionRepository extends JpaRepository<ShareTransaction, UUID> {
    List<ShareTransaction> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
}
