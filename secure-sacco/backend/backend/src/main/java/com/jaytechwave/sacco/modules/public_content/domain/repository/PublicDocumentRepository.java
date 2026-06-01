package com.jaytechwave.sacco.modules.public_content.domain.repository;

import com.jaytechwave.sacco.modules.public_content.domain.entity.PublicDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PublicDocumentRepository extends JpaRepository<PublicDocument, UUID> {
    List<PublicDocument> findByIsPublishedTrueOrderByCreatedAtDesc();
    List<PublicDocument> findAllByOrderByCreatedAtDesc();
    List<PublicDocument> findByCategoryAndIsPublishedTrueOrderByMeetingDateDesc(String category);
}