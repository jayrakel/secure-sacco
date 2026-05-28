package com.jaytechwave.sacco.modules.meetings.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.meetings.api.dto.MeetingDTOs.*;
import com.jaytechwave.sacco.modules.meetings.domain.entity.*;
import com.jaytechwave.sacco.modules.meetings.domain.entity.AttendanceStatus;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingAttendanceRepository;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.penalties.domain.entity.*;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MeetingAttendanceRepository attendanceRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final SecurityAuditService securityAuditService;
    private final MeetingPenaltyService meetingPenaltyService;

    @Transactional(readOnly = true)
    public Page<MeetingSummaryResponse> listAllMeetings(Pageable pageable) {
        return meetingRepository.findAll(pageable)
                .map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public MeetingSummaryResponse getMeeting(UUID id) {
        return toSummary(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordResponse> getAttendance(UUID meetingId) {
        findOrThrow(meetingId);
        List<MeetingAttendance> records = attendanceRepository.findByMeetingId(meetingId);

        Set<UUID> memberIds = records.stream().map(MeetingAttendance::getMemberId).collect(Collectors.toSet());
        Map<UUID, Member> memberMap = memberRepository.findAllById(memberIds)
                .stream().collect(Collectors.toMap(Member::getId, m -> m));

        return records.stream().map(a -> {
            Member m = memberMap.get(a.getMemberId());
            String name = m != null ? m.getFirstName() + " " + m.getLastName() : "Unknown";
            String number = m != null ? m.getMemberNumber() : "-";
            return new AttendanceRecordResponse(
                    a.getId(), meetingId, a.getMemberId(), name, number, a.getStatus(),
                    a.getRecordedAt(), a.getArrivedAt()
            );
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MeetingAttendanceSummaryResponse> getMyMeetings(UUID memberId) {
        List<MeetingAttendance> records = attendanceRepository.findByMemberId(memberId);
        Map<UUID, MeetingAttendance> byMeeting = records.stream()
                .collect(Collectors.toMap(a -> a.getMeeting().getId(), a -> a, (a, b) -> a));

        return meetingRepository.findAllByOrderByStartAtDesc().stream()
                .map(m -> {
                    MeetingAttendance rec = byMeeting.get(m.getId());
                    AttendanceStatus status = rec != null ? rec.getStatus() : null;
                    return new MeetingAttendanceSummaryResponse(
                            m.getId(), m.getTitle(), m.getStartAt(), status, m.getStatus()
                    );
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public MeetingSummaryResponse createMeeting(CreateMeetingRequest req, String creatorEmail) {
        User creator = userRepository.findByEmail(creatorEmail).orElseThrow();
        Meeting meeting = Meeting.builder()
                .title(req.title())
                .description(req.description())
                .meetingType(req.meetingType() != null ? req.meetingType() : MeetingType.GENERAL)
                .startAt(req.startAt())
                .endAt(req.endAt())
                .lateAfterMinutes(req.lateAfterMinutes() != null ? req.lateAfterMinutes() : 15)
                .status(MeetingStatus.SCHEDULED)
                .createdByUserId(creator.getId())
                .build();

        Meeting saved = meetingRepository.save(meeting);

        securityAuditService.logEvent(
                "MEETING_CREATED",
                "MEETING-" + saved.getId(),
                "Meeting scheduled: '" + saved.getTitle() + "' on " + saved.getStartAt()
        );

        log.info("Meeting created [{}] by {}", saved.getId(), creatorEmail);
        return toSummary(saved);
    }

    @Transactional
    public MeetingSummaryResponse updateMeeting(UUID id, UpdateMeetingRequest req) {
        Meeting meeting = findOrThrow(id);
        if (meeting.getStatus() != MeetingStatus.SCHEDULED) {
            throw new IllegalStateException("Only SCHEDULED meetings can be edited.");
        }
        if (req.title() != null)            meeting.setTitle(req.title());
        if (req.description() != null)      meeting.setDescription(req.description());
        if (req.meetingType() != null)      meeting.setMeetingType(req.meetingType());
        if (req.startAt() != null)          meeting.setStartAt(req.startAt());
        if (req.endAt() != null)            meeting.setEndAt(req.endAt());
        if (req.lateAfterMinutes() != null) meeting.setLateAfterMinutes(req.lateAfterMinutes());

        MeetingSummaryResponse response = toSummary(meetingRepository.save(meeting));

        securityAuditService.logEvent(
                "MEETING_UPDATED",
                "MEETING-" + id,
                "Meeting details updated: '" + meeting.getTitle() + "'"
        );

        return response;
    }

    @Transactional
    public MeetingSummaryResponse cancelMeeting(UUID id, String email, String ip) {
        Meeting meeting = findOrThrow(id);
        if (meeting.getStatus() == MeetingStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a completed meeting.");
        }
        meeting.setStatus(MeetingStatus.CANCELED);
        meetingRepository.save(meeting);
        securityAuditService.logEventWithActorAndIp(email, "MEETING_CANCELED",
                "MEETING-" + id, ip, "Meeting canceled: " + meeting.getTitle());
        return toSummary(meeting);
    }

    @Transactional
    public List<AttendanceRecordResponse> recordAttendance(UUID meetingId,
                                                           BulkAttendanceRequest req,
                                                           String recorderEmail) {
        Meeting meeting = findOrThrow(meetingId);
        if (meeting.getStatus() == MeetingStatus.CANCELED) {
            throw new IllegalStateException("Cannot record attendance for a canceled meeting.");
        }
        User recorder = userRepository.findByEmail(recorderEmail).orElseThrow();

        for (BulkAttendanceEntry entry : req.records()) {
            MeetingAttendance attendance = attendanceRepository
                    .findByMeetingIdAndMemberId(meetingId, entry.memberId())
                    .orElse(MeetingAttendance.builder()
                            .meeting(meeting)
                            .memberId(entry.memberId())
                            .build());
            attendance.setStatus(entry.status());
            attendance.setRecordedByUserId(recorder.getId());
            // Set arrivedAt only when provided by staff — used for penalty tier calculation.
            // recordedAt is managed by Hibernate (@CreationTimestamp) and is NOT used for lateness.
            if (entry.arrivedAt() != null && entry.status() == AttendanceStatus.LATE) {
                attendance.setArrivedAt(entry.arrivedAt());
            }
            attendanceRepository.save(attendance);
        }

        securityAuditService.logEvent(
                "ATTENDANCE_RECORDED",
                "MEETING-" + meetingId,
                "Attendance recorded for " + req.records().size() + " members by " + recorderEmail
        );

        return getAttendance(meetingId);
    }

    @Transactional
    public MeetingSummaryResponse completeMeeting(UUID id, String email, String ip) {
        Meeting meeting = findOrThrow(id);
        if (meeting.getStatus() != MeetingStatus.SCHEDULED) {
            throw new IllegalStateException("Only SCHEDULED meetings can be completed.");
        }
        meeting.setStatus(MeetingStatus.COMPLETED);
        if (meeting.getEndAt() == null) meeting.setEndAt(LocalDateTime.now());
        meetingRepository.save(meeting);

        meetingPenaltyService.generatePenalties(meeting);

        securityAuditService.logEventWithActorAndIp(email, "MEETING_COMPLETED",
                "MEETING-" + id, ip, "Meeting completed: " + meeting.getTitle());
        log.info("Meeting {} completed by {}", id, email);
        return toSummary(meeting);
    }

    @Transactional
    public AttendanceRecordResponse memberCheckIn(UUID meetingId, UUID memberId) {
        Meeting meeting = findOrThrow(meetingId);

        if (meeting.getStatus() != MeetingStatus.SCHEDULED) {
            throw new IllegalStateException("This meeting is no longer active.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(meeting.getStartAt())) {
            throw new IllegalStateException("Meeting has not started yet.");
        }

        MeetingAttendance existing = attendanceRepository
                .findByMeetingIdAndMemberId(meetingId, memberId)
                .orElse(null);

        if (existing != null &&
                (existing.getStatus() == AttendanceStatus.PRESENT || existing.getStatus() == AttendanceStatus.LATE)) {
            Member m = memberRepository.findById(memberId).orElse(null);
            String name = m != null ? m.getFirstName() + " " + m.getLastName() : "Unknown";
            String number = m != null ? m.getMemberNumber() : "-";
            return new AttendanceRecordResponse(
                    existing.getId(), meetingId, memberId, name, number,
                    existing.getStatus(), existing.getRecordedAt(), existing.getArrivedAt()
            );
        }

        LocalDateTime lateThreshold = meeting.getStartAt().plusMinutes(meeting.getLateAfterMinutes());
        AttendanceStatus status = now.isAfter(lateThreshold)
                ? AttendanceStatus.LATE
                : AttendanceStatus.PRESENT;

        MeetingAttendance attendance = existing != null ? existing :
                MeetingAttendance.builder()
                        .meeting(meeting)
                        .memberId(memberId)
                        .build();

        attendance.setStatus(status);
        attendance.setRecordedByUserId(memberId);
        attendance.setArrivedAt(now); // Exact moment of self-check-in — used for penalty tier calculation
        attendanceRepository.save(attendance);

        Member m = memberRepository.findById(memberId).orElse(null);
        String name = m != null ? m.getFirstName() + " " + m.getLastName() : "Unknown";
        String number = m != null ? m.getMemberNumber() : "-";

        log.info("Member {} checked in to meeting {} as {}", memberId, meetingId, status);

        return new AttendanceRecordResponse(
                attendance.getId(), meetingId, memberId, name, number,
                status, attendance.getRecordedAt(), attendance.getArrivedAt()
        );
    }

    /**
     * Called by {@link com.jaytechwave.sacco.modules.meetings.job.MeetingAutoCompleteJob}
     * when a meeting's scheduled end time has passed.
     */
    @Transactional
    public void autoCompleteMeeting(UUID id) {
        Meeting meeting = findOrThrow(id);

        if (meeting.getStatus() != MeetingStatus.SCHEDULED) {
            log.info("autoCompleteMeeting: Meeting {} is already {} — skipping.", id, meeting.getStatus());
            return;
        }

        meeting.setStatus(MeetingStatus.COMPLETED);
        if (meeting.getEndAt() == null) meeting.setEndAt(LocalDateTime.now());
        meetingRepository.save(meeting);

        meetingPenaltyService.generatePenalties(meeting);

        securityAuditService.logEvent(
                "MEETING_AUTO_COMPLETED",
                "MEETING-" + id,
                "Meeting auto-completed by scheduler: " + meeting.getTitle()
        );

        log.info("Meeting {} auto-completed by scheduler. Penalties generated.", id);
    }


    private Meeting findOrThrow(UUID id) {
        return meetingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Meeting not found: " + id));
    }

    private MeetingSummaryResponse toSummary(Meeting m) {
        return new MeetingSummaryResponse(
                m.getId(), m.getTitle(), m.getDescription(), m.getMeetingType(),
                m.getStartAt(), m.getEndAt(), m.getLateAfterMinutes(), m.getStatus(), m.getCreatedAt()
        );
    }
}