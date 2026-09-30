package com.jaytechwave.sacco.modules.users.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notification_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Builder.Default
    @Column(nullable = false)
    private boolean emailEnabled = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean smsEnabled = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean notifyOnGuarantorRequests = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean notifyOnLoanUpdates = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean notifyOnTransactions = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
