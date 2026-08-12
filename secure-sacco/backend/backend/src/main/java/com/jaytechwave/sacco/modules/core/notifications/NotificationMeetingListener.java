package com.jaytechwave.sacco.modules.core.notifications;

import com.jaytechwave.sacco.modules.meetings.domain.entity.Meeting;
import com.jaytechwave.sacco.modules.meetings.domain.event.MeetingCreatedEvent;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
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
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationMeetingListener {

    private final SmsNotificationService smsNotificationService;
    private final MemberRepository memberRepository;
    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;

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

        // We no longer send SMS notifications immediately here.
        // Instead, the MeetingNotificationJob will handle sending reminders
        // 24 hours before the meeting starts.
        log.info("Meeting {} scheduled. Notifications will be handled by MeetingNotificationJob.", meeting.getId());
    }
}
