package com.jaytechwave.sacco.modules.core.notifications;

import com.jaytechwave.sacco.modules.meetings.domain.entity.Meeting;
import com.jaytechwave.sacco.modules.meetings.domain.event.MeetingCreatedEvent;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationMeetingListener {

    private final SmsNotificationService smsNotificationService;
    private final MemberRepository memberRepository;
    private final MeetingRepository meetingRepository;

    @Order(org.springframework.core.Ordered.LOWEST_PRECEDENCE)
    @Async
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleMeetingCreated(MeetingCreatedEvent event) {
        log.info("NotificationMeetingListener: Processing MeetingCreatedEvent for meeting: {}", event.meetingId());

        Meeting meeting = meetingRepository.findById(event.meetingId()).orElse(null);
        if (meeting == null) {
            log.warn("Meeting {} not found. Aborting notifications.", event.meetingId());
            return;
        }

        List<Member> activeMembers = memberRepository.findByStatus(MemberStatus.ACTIVE);
        if (activeMembers.isEmpty()) {
            log.info("No ACTIVE members to notify for meeting: {}", meeting.getId());
            return;
        }

        String meetingTypeStr = meeting.getMeetingType() != null ? meeting.getMeetingType().name() : "GENERAL";
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a");

        String formattedDate = meeting.getStartAt().format(dateFormatter);
        String formattedTime = meeting.getStartAt().format(timeFormatter);

        // Calculate available space for title.
        // SMS Format: Dear {firstName}, {type} meeting '{title}' on {date} {time}. Please attend.
        // We will process the title per member to ensure it doesn't exceed 158 chars.

        for (Member member : activeMembers) {
            if (member.getPhoneNumber() == null || member.getPhoneNumber().isBlank()) {
                continue;
            }

            String firstName = member.getFirstName();
            if (firstName == null || firstName.isBlank()) {
                firstName = "Member";
            }

            String baseMessage = String.format("Dear %s, %s meeting '' on %s %s. Please attend.", 
                    firstName, meetingTypeStr, formattedDate, formattedTime);

            int allowedTitleLength = 158 - baseMessage.length();
            String title = meeting.getTitle();
            
            if (allowedTitleLength < 5) {
                // In an extreme case where firstName is extremely long, fallback to generic
                baseMessage = String.format("Dear Member, %s meeting '' on %s %s. Please attend.", 
                        meetingTypeStr, formattedDate, formattedTime);
                allowedTitleLength = 158 - baseMessage.length();
            }

            if (title != null && title.length() > allowedTitleLength) {
                title = title.substring(0, allowedTitleLength - 3) + "...";
            } else if (title == null) {
                title = "Meeting";
            }

            String finalMessage = String.format("Dear %s, %s meeting '%s' on %s %s. Please attend.", 
                    firstName, meetingTypeStr, title, formattedDate, formattedTime);

            smsNotificationService.sendNotificationSms(member.getPhoneNumber(), finalMessage);
        }

        log.info("Finished dispatching {} SMS notifications for Meeting {}", activeMembers.size(), meeting.getId());
    }
}
