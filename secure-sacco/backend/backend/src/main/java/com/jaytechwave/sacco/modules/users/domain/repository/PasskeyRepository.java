package com.jaytechwave.sacco.modules.users.domain.repository;

import com.jaytechwave.sacco.modules.users.domain.entity.Passkey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasskeyRepository extends JpaRepository<Passkey, UUID> {
    List<Passkey> findAllByUserId(UUID userId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    Optional<Passkey> findByCredentialId(byte[] credentialId);
}
