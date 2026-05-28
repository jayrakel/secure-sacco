package com.jaytechwave.sacco.modules.meetings.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "meeting_attendance",
        uniqueConstraints = @UniqueConstraint(columnNames = {"meeting_id", "member_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MeetingAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private AttendanceStatus status = AttendanceStatus.ABSENT;

    @Column(name = "recorded_by_user_id")
    private UUID recordedByUserId;

    /**
     * Administrative timestamp — when this record was created or last updated.
     * Managed by Hibernate. Do NOT use this for penalty tier calculation.
     */
    @CreationTimestamp
    @Column(name = "recorded_at", updatable = false)
    private LocalDateTime recordedAt;

    /**
     * The actual time the member arrived at the meeting.
     * This is what the penalty engine uses to determine the lateness tier.
     *
     * <ul>
     *   <li>Self check-in: set to {@code LocalDateTime.now()} at the moment of check-in.</li>
     *   <li>Manual recording: set by staff if they know when the member arrived.
     *       If null when status=LATE, the minimum penalty tier is applied.</li>
     *   <li>ABSENT records: always null.</li>
     * </ul>
     */
    @Column(name = "arrived_at")
    private LocalDateTime arrivedAt;
}