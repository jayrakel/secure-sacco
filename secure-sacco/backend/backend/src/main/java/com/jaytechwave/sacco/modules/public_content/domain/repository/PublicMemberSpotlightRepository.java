package com.jaytechwave.sacco.modules.public_content.domain.repository;

import com.jaytechwave.sacco.modules.public_content.domain.entity.PublicMemberSpotlight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PublicMemberSpotlightRepository extends JpaRepository<PublicMemberSpotlight, UUID> {
    List<PublicMemberSpotlight> findByIsPublishedTrueOrderByDisplayOrderAsc();
    List<PublicMemberSpotlight> findAllByOrderByDisplayOrderAsc();
}