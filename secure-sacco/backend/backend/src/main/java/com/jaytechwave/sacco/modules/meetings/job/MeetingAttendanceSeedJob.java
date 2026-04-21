package com.jaytechwave.sacco.modules.meetings.job;

import com.jaytechwave.sacco.modules.meetings.domain.entity.*;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingAttendanceRepository;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class MeetingAttendanceSeedJob {

    private final MeetingRepository          meetingRepository;
    private final MeetingAttendanceRepository attendanceRepository;
    private final MemberRepository           memberRepository;

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void seedAttendance() {
        LocalDateTime now = LocalDateTime.now();

        List<Meeting> meetings = meetingRepository
                .findUnseededMeetingsThatHaveStarted(
                        MeetingStatus.SCHEDULED, now);

        if (meetings.isEmpty()) return;

        log.info("MeetingAttendanceSeedJob: {} meeting(s) need attendance seeding.", meetings.size());

        List<Member> activeMembers = memberRepository.findByStatus(MemberStatus.ACTIVE);
        if (activeMembers.isEmpty()) {
            log.warn("MeetingAttendanceSeedJob: No active members found — skipping seed.");
            return;
        }

        for (Meeting meeting : meetings) {
            try {
                seedMeeting(meeting, activeMembers);
            } catch (Exception e) {
                log.error("MeetingAttendanceSeedJob: Failed to seed meeting {}: {}",
                        meeting.getId(), e.getMessage(), e);
            }
        }
    }

    private void seedMeeting(Meeting meeting, List<Member> activeMembers) {
        int created = 0;

        for (Member member : activeMembers) {
            boolean alreadyHasRecord = attendanceRepository
                    .findByMeetingIdAndMemberId(meeting.getId(), member.getId())
                    .isPresent();

            if (!alreadyHasRecord) {
                MeetingAttendance record = MeetingAttendance.builder()
                        .meeting(meeting)
                        .memberId(member.getId())
                        .status(AttendanceStatus.ABSENT)
                        .recordedAt(LocalDateTime.now()) // FIX: Explicitly set to prevent L1 Cache NPEs in rapid concurrent job runs
                        .build();
                attendanceRepository.save(record);
                created++;
            }
        }

        meeting.setAttendanceSeeded(true);
        meetingRepository.save(meeting);

        log.info("MeetingAttendanceSeedJob: Meeting '{}' [{}] seeded — {} ABSENT records created, {} members already had records.",
                meeting.getTitle(), meeting.getId(), created, activeMembers.size() - created);
    }
}