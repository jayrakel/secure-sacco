package com.jaytechwave.sacco.modules.meetings.api.dto;

import com.jaytechwave.sacco.modules.meetings.domain.entity.AttendanceStatus;
import com.jaytechwave.sacco.modules.meetings.domain.entity.MeetingStatus;
import com.jaytechwave.sacco.modules.meetings.domain.entity.MeetingType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class MeetingDTOs {

    public record CreateMeetingRequest(
            String title,
            String description,
            MeetingType meetingType,
            LocalDateTime startAt,
            LocalDateTime endAt,
            Integer lateAfterMinutes
    ) {}

    public record UpdateMeetingRequest(
            String title,
            String description,
            MeetingType meetingType,
            LocalDateTime startAt,
            LocalDateTime endAt,
            Integer lateAfterMinutes
    ) {}

    /**
     * Single entry in a bulk attendance submission.
     *
     * {@code arrivedAt} is optional and only meaningful when {@code status = LATE}.
     * When provided, the penalty engine uses it to determine the correct lateness tier:
     * <ul>
     *   <li>&lt; 120 minutes late → MEETING_LATE_30</li>
     *   <li>&ge; 120 minutes late → MEETING_LATE_120</li>
     * </ul>
     * When null and status is LATE, the minimum tier (MEETING_LATE_30) is applied.
     */
    public record BulkAttendanceEntry(
            UUID memberId,
            AttendanceStatus status,
            LocalDateTime arrivedAt   // null-safe — optional for LATE, ignored for PRESENT/ABSENT
    ) {}

    public record BulkAttendanceRequest(
            List<BulkAttendanceEntry> records
    ) {}

    public record MeetingSummaryResponse(
            UUID id,
            String title,
            String description,
            MeetingType meetingType,
            LocalDateTime startAt,
            LocalDateTime endAt,
            Integer lateAfterMinutes,
            MeetingStatus status,
            LocalDateTime createdAt
    ) {}

    public record AttendanceRecordResponse(
            UUID id,
            UUID meetingId,
            UUID memberId,
            String memberName,
            String memberNumber,
            AttendanceStatus status,
            LocalDateTime recordedAt,
            LocalDateTime arrivedAt   // exposed to frontend so it can show arrival time
    ) {}

    public record MeetingAttendanceSummaryResponse(
            UUID meetingId,
            String meetingTitle,
            LocalDateTime startAt,
            AttendanceStatus myStatus,
            MeetingStatus meetingStatus
    ) {}
}