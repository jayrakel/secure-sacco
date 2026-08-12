package com.jaytechwave.sacco.modules.shares.domain.repository;

import com.jaytechwave.sacco.modules.shares.domain.entity.ShareAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShareAccountRepository extends JpaRepository<ShareAccount, UUID> {
    Optional<ShareAccount> findByMemberIdAndProductId(UUID memberId, UUID productId);
    List<ShareAccount> findByMemberId(UUID memberId);
}
