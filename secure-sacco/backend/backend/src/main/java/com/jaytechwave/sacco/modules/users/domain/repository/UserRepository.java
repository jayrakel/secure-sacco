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
    boolean existsByEmailAndMustChangePasswordTrue(String email);

    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumberHash(String phoneNumberHash);

    @EntityGraph(attributePaths = {"member"})
    Optional<User> findWithMemberByEmail(String email);

    /**
     * Looks up a user by email (plaintext) OR by phone number hash (HMAC-SHA256).
     * The phone_number column is AES-GCM encrypted with a per-write random IV,
     * so direct equality matching is impossible — we match on the deterministic hash instead.
     *
     * Callers must pre-compute the phone hash via PiiSearchHashConverter before passing it here.
     */
    @Query("SELECT u FROM User u WHERE u.email = :email OR u.phoneNumberHash = :phoneHash")
    Optional<User> findByEmailOrPhoneNumberHash(@Param("email") String email, @Param("phoneHash") String phoneHash);

    List<User> findAllByIsDeletedFalse();

    Optional<User> findByIdAndIsDeletedFalse(UUID id);

    /**
     * Returns true if ANY non-deleted user currently holds the given role name.
     * Used by DataInitializer and SetupService for role-based existence checks.
     */
    boolean existsByRolesName(String roleName);

    /**
     * Returns the first user who holds the given role name.
     * Used for system-admin lookup (there should only ever be one).
     */
    Optional<User> findFirstByRolesName(String roleName);

    /**
     * Count how many users have a specific role.
     * Used when changing role permissions to determine how many sessions will be affected.
     */
    long countByRolesId(UUID roleId);
}