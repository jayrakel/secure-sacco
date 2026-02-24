package com.jaytechwave.sacco.modules.roles.domain.repository;

import com.jaytechwave.sacco.modules.roles.domain.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    boolean existsByName(String name);
    Optional<Role> findByName(String name);
}