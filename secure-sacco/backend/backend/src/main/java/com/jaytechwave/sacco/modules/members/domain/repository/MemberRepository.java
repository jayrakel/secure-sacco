package com.jaytechwave.sacco.modules.members.domain.repository;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MemberRepository extends JpaRepository<Member, UUID> {

    boolean existsByNationalId(String nationalId);
    boolean existsByEmail(String email);
    boolean existsByPhoneNumber(String phoneNumber);

    @Query("SELECT m FROM Member m WHERE " +
            "(:q IS NULL OR :q = '' OR " +
            "LOWER(m.memberNumber) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(m.firstName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(m.lastName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(m.phoneNumber) LIKE LOWER(CONCAT('%', :q, '%'))) " +
            "AND (:status IS NULL OR m.status = :status)")
    Page<Member> searchMembers(@Param("q") String q, @Param("status") MemberStatus status, Pageable pageable);
}