package com.jaytechwave.sacco.modules.members.domain.repository;

import com.jaytechwave.sacco.modules.members.domain.entity.MemberSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemberSequenceRepository extends JpaRepository<MemberSequence, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM MemberSequence s")
    Optional<MemberSequence> findSequenceWithLock();
}