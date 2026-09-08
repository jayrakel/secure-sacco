package com.jaytechwave.sacco.modules.maintenance.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "system_maintenance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemMaintenance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "maintenance_start_time", nullable = false)
    private LocalDateTime maintenanceStartTime;

    @Column(name = "maintenance_end_time", nullable = false)
    private LocalDateTime maintenanceEndTime;

    @Column(name = "notify_members_app", nullable = false)
    @Builder.Default
    private boolean notifyMembersApp = true;

    @Column(name = "notify_members_sms", nullable = false)
    @Builder.Default
    private boolean notifyMembersSms = false;

    @Column(name = "notify_members_email", nullable = false)
    @Builder.Default
    private boolean notifyMembersEmail = false;

    @Column(name = "members_notified", nullable = false)
    @Builder.Default
    private boolean membersNotified = false;

    @Column(name = "admin_reminded", nullable = false)
    @Builder.Default
    private boolean adminReminded = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
