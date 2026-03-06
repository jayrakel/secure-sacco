package com.jaytechwave.sacco.modules.meetings.domain.repository;

import com.jaytechwave.sacco.modules.meetings.domain.entity.AttendanceStatus;
import com.jaytechwave.sacco.modules.meetings.domain.entity.MeetingAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MeetingAttendanceRepository extends JpaRepository<MeetingAttendance, UUID> {
    List<MeetingAttendance> findByMeetingId(UUID meetingId);
    List<MeetingAttendance> findByMemberId(UUID memberId);
    Optional<MeetingAttendance> findByMeetingIdAndMemberId(UUID meetingId, UUID memberId);
    boolean existsByMeetingIdAndMemberIdAndStatus(UUID meetingId, UUID memberId, AttendanceStatus status);
}