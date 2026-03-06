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

    public record BulkAttendanceEntry(
            UUID memberId,
            AttendanceStatus status
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
            LocalDateTime recordedAt
    ) {}

    public record MeetingAttendanceSummaryResponse(
            UUID meetingId,
            String meetingTitle,
            LocalDateTime startAt,
            AttendanceStatus myStatus,
            MeetingStatus meetingStatus
    ) {}
}