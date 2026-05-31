package com.jaytechwave.sacco.modules.public_content.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "public_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PublicDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String description = "";

    @Column(nullable = false)
    private String category;    // MEETING_MINUTES | NOTICE | FINANCIAL_REPORT | POLICY | OTHER

    @Column(name = "file_url", nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "file_name")
    @Builder.Default
    private String fileName = "";

    @Column(name = "meeting_date")
    private LocalDate meetingDate;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private boolean isPublished = true;

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}