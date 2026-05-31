package com.jaytechwave.sacco.modules.public_content.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "public_announcements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PublicAnnouncement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "is_pinned", nullable = false)
    @Builder.Default
    private boolean isPinned = false;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private boolean isPublished = true;

    @Column(name = "published_by", nullable = false)
    private UUID publishedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}