package com.jaytechwave.sacco.modules.users.domain.repository;

import com.jaytechwave.sacco.modules.users.domain.entity.VerificationToken;
import com.jaytechwave.sacco.modules.users.domain.entity.VerificationTokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationTokenRepository extends JpaRepository<VerificationToken, UUID> {
    Optional<VerificationToken> findByTokenAndTokenTypeAndIsUsedFalse(String token, VerificationTokenType type);
    Optional<VerificationToken> findFirstByUserIdAndTokenTypeAndIsUsedFalseOrderByCreatedAtDesc(UUID userId, VerificationTokenType type);
    int countByUserIdAndTokenTypeAndCreatedAtAfter(UUID userId, VerificationTokenType type, ZonedDateTime time);
}