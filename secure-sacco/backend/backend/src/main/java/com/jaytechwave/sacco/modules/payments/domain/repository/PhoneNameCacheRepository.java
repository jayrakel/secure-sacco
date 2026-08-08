package com.jaytechwave.sacco.modules.payments.domain.repository;

import com.jaytechwave.sacco.modules.payments.domain.entity.PhoneNameCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhoneNameCacheRepository extends JpaRepository<PhoneNameCache, UUID> {
    Optional<PhoneNameCache> findByPhoneNumber(String phoneNumber);
}
