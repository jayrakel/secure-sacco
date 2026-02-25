package com.jaytechwave.sacco.modules.audit.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "security_audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecurityAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String actor;

    @Column(nullable = false, length = 100)
    private String action;

    private String target;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(columnDefinition = "TEXT")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}