package com.jaytechwave.sacco.modules.meetings.domain.repository;

import com.jaytechwave.sacco.modules.meetings.domain.entity.Meeting;
import com.jaytechwave.sacco.modules.meetings.domain.entity.MeetingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {

    List<Meeting> findAllByOrderByStartAtDesc();

    List<Meeting> findByStartAtBetweenOrderByStartAtAsc(LocalDateTime from, LocalDateTime to);

    List<Meeting> findByStatusOrderByStartAtDesc(MeetingStatus status);

    // ── Used by MeetingAttendanceSeedJob ──────────────────────────────────────

    /**
     * Finds SCHEDULED meetings whose start time has passed and whose
     * attendance has not yet been seeded.
     *
     * Uses explicit @Query because Spring Data JPA mis-parses boolean field
     * names ending in 'ed' (attendanceSeeded) when followed by the 'False'
     * keyword — it looks for a property called 'attendanceSeed' which doesn't
     * exist, causing startup failure.
     */
    @Query("""
            SELECT m FROM Meeting m
            WHERE m.status = :status
              AND m.startAt <= :now
              AND m.attendanceSeeded = false
            """)
    List<Meeting> findUnseededMeetingsThatHaveStarted(
            @Param("status") MeetingStatus status,
            @Param("now") LocalDateTime now);

    // ── Used by MeetingAutoCompleteJob ────────────────────────────────────────

    /**
     * Finds SCHEDULED meetings that have an explicit endAt and whose
     * end time has passed.
     */
    List<Meeting> findByStatusAndEndAtLessThanEqual(
            MeetingStatus status, LocalDateTime now);

    /**
     * Finds SCHEDULED meetings with NO explicit endAt (null) where the
     * startAt was more than defaultDurationHours hours ago.
     * Safety net so meetings never stay open indefinitely.
     */
    @Query("""
            SELECT m FROM Meeting m
            WHERE m.status = :status
              AND m.endAt IS NULL
              AND m.startAt <= :cutoff
            """)
    List<Meeting> findScheduledWithNoEndAtBefore(
            @Param("status") MeetingStatus status,
            @Param("cutoff") LocalDateTime cutoff);
}