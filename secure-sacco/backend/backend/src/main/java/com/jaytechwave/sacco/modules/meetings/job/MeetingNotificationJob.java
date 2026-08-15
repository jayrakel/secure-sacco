package com.jaytechwave.sacco.modules.meetings.job;

import com.jaytechwave.sacco.modules.meetings.domain.entity.Meeting;
import com.jaytechwave.sacco.modules.meetings.domain.entity.MeetingStatus;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingRepository;
import com.jaytechwave.sacco.modules.meetings.domain.service.MeetingNotificationService;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class MeetingNotificationJob {

    private final MeetingRepository meetingRepository;
    private final MemberRepository memberRepository;
    private final MeetingNotificationService meetingNotificationService;

    // Run every 15 minutes
    @Scheduled(cron = "0 0/15 * * * ?")
    public void sendScheduledMeetingNotifications() {
        LocalDateTime cutoff = LocalDateTime.now().plusHours(24);
        List<Meeting> meetings = meetingRepository.findMeetingsForNotification(MeetingStatus.SCHEDULED, cutoff);

        if (meetings.isEmpty()) {
            return;
        }

        log.info("Found {} meetings starting within 24 hours that need notifications", meetings.size());

        List<Member> activeMembers = memberRepository.findByStatus(MemberStatus.ACTIVE);
        if (activeMembers.isEmpty()) {
            log.warn("No active members found to notify for meetings.");
            return;
        }

        for (Meeting meeting : meetings) {
            try {
                meetingNotificationService.sendMeetingReminder(meeting, activeMembers);
                
                // Mark as sent
                meeting.setNotificationSent(true);
                meetingRepository.save(meeting);
                
                log.info("Successfully sent notifications for meeting {}", meeting.getId());
            } catch (Exception e) {
                log.error("Failed to send notifications for meeting {}", meeting.getId(), e);
            }
        }
    }
}
