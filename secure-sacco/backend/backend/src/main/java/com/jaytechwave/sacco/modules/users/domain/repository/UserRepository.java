package com.jaytechwave.sacco.modules.users.domain.repository;

import com.jaytechwave.sacco.modules.users.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    boolean existsByEmail(String email);
    boolean existsByPhoneNumber(String phoneNumber);

    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);
}