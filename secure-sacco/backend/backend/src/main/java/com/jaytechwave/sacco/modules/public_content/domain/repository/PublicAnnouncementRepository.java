package com.jaytechwave.sacco.modules.public_content.domain.repository;

import com.jaytechwave.sacco.modules.public_content.domain.entity.PublicAnnouncement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PublicAnnouncementRepository extends JpaRepository<PublicAnnouncement, UUID> {
    List<PublicAnnouncement> findByIsPublishedTrueOrderByIsPinnedDescCreatedAtDesc();
    List<PublicAnnouncement> findAllByOrderByCreatedAtDesc();
}