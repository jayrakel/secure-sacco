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
    boolean existsByPhoneNumberHash(String phoneNumberHash);
    Optional<User> findByPhoneNumberHash(String phoneNumberHash);
    boolean existsByEmailAndMustChangePasswordTrue(String email);

    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);

    @EntityGraph(attributePaths = {"member"})
    Optional<User> findWithMemberByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.email = :identifier OR u.phoneNumberHash = :hashedIdentifier")
    Optional<User> findByEmailOrPhoneNumber(@Param("identifier") String identifier, @Param("hashedIdentifier") String hashedIdentifier);

    List<User> findAllByIsDeletedFalse();

    Optional<User> findByIdAndIsDeletedFalse(UUID id);
}