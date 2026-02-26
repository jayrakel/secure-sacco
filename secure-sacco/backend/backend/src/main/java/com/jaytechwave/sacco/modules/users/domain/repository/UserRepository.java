package com.jaytechwave.sacco.modules.users.domain.repository;

import com.jaytechwave.sacco.modules.users.domain.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    boolean existsByEmail(String email);
    boolean existsByPhoneNumber(String phoneNumber);

    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);

    @EntityGraph(attributePaths = {"member"})
    Optional<User> findWithMemberByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.email = :identifier OR u.phoneNumber = :identifier")
    Optional<User> findByEmailOrPhoneNumber(@Param("identifier") String identifier);

    List<User> findAllByIsDeletedFalse();

    Optional<User> findByIdAndIsDeletedFalse(UUID id);
}