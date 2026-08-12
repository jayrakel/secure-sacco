package com.jaytechwave.sacco.modules.meetings.job;

import com.jaytechwave.sacco.modules.core.notifications.SmsNotificationService;
import com.jaytechwave.sacco.modules.meetings.domain.entity.Meeting;
import com.jaytechwave.sacco.modules.meetings.domain.entity.MeetingStatus;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class MeetingNotificationJob {

    private final MeetingRepository meetingRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final SmsNotificationService smsNotificationService;

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

        LocalTime now = LocalTime.now();
        String greeting = "Good evening";
        if (now.isBefore(LocalTime.NOON)) {
            greeting = "Good morning";
        } else if (now.isBefore(LocalTime.of(17, 0))) {
            greeting = "Good afternoon";
        }

        for (Meeting meeting : meetings) {
            try {
                sendNotificationsForMeeting(meeting, activeMembers, greeting);
                
                // Mark as sent
                meeting.setNotificationSent(true);
                meetingRepository.save(meeting);
                
                log.info("Successfully sent notifications for meeting {}", meeting.getId());
            } catch (Exception e) {
                log.error("Failed to send notifications for meeting {}", meeting.getId(), e);
            }
        }
    }

    private void sendNotificationsForMeeting(Meeting meeting, List<Member> activeMembers, String timeOfDayGreeting) {
        String signature = getCreatorSignature(meeting);
        
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a");
        String formattedTime = meeting.getStartAt().format(timeFormatter);
        
        LocalDate meetingDate = meeting.getStartAt().toLocalDate();
        LocalDate today = LocalDate.now();
        
        String datePhrase;
        if (meetingDate.isEqual(today)) {
            datePhrase = "today";
        } else if (meetingDate.isEqual(today.plusDays(1))) {
            datePhrase = "tomorrow";
        } else {
            datePhrase = "on " + meetingDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        }

        String title = meeting.getTitle();
        if (title == null || title.isBlank()) {
            String type = meeting.getMeetingType() != null ? meeting.getMeetingType().name() : "GENERAL";
            title = type.substring(0, 1).toUpperCase() + type.substring(1).toLowerCase() + " Meeting";
            title = title.replace("_", " ");
        }

        for (Member member : activeMembers) {
            if (member.getPhoneNumber() == null || member.getPhoneNumber().isBlank()) {
                continue;
            }

            String firstName = member.getFirstName();
            if (firstName == null || firstName.isBlank()) {
                firstName = "Member";
            }
            
            // Format: Good morning Nathan, we will be holding a General Meeting tomorrow, at 04:00 PM, make an effort to attend. Regards, Charles (Secretary)
            
            String baseMessage = String.format("%s %s, we will be holding a  %s, at %s, make an effort to attend. Regards, %s", 
                    timeOfDayGreeting, firstName, datePhrase, formattedTime, signature);

            int allowedTitleLength = 158 - baseMessage.length();
            String safeTitle = title;
            
            if (allowedTitleLength < 5) {
                // Fallback to "Member" if name is too long
                baseMessage = String.format("%s Member, we will be holding a  %s, at %s, make an effort to attend. Regards, %s", 
                        timeOfDayGreeting, datePhrase, formattedTime, signature);
                allowedTitleLength = 158 - baseMessage.length();
            }

            if (safeTitle.length() > allowedTitleLength) {
                safeTitle = safeTitle.substring(0, allowedTitleLength - 3) + "...";
            }

            String finalMessage = String.format("%s %s, we will be holding a %s %s, at %s, make an effort to attend. Regards, %s", 
                    timeOfDayGreeting, firstName, safeTitle, datePhrase, formattedTime, signature);

            smsNotificationService.sendNotificationSms(member.getPhoneNumber(), finalMessage);
        }
    }

    private String getCreatorSignature(Meeting meeting) {
        String senderName = "Management";
        String senderRole = "";
        
        if (meeting.getCreatedByUserId() != null) {
            User creator = userRepository.findById(meeting.getCreatedByUserId()).orElse(null);
            if (creator != null) {
                senderName = creator.getFirstName();
                if (creator.getRoles() != null && !creator.getRoles().isEmpty()) {
                    List<String> roleNames = creator.getRoles().stream()
                            .map(com.jaytechwave.sacco.modules.roles.domain.entity.Role::getName)
                            .collect(Collectors.toList());
                    if (roleNames.contains("CHAIRPERSON")) {
                        senderRole = " (Chairperson)";
                    } else if (roleNames.contains("SECRETARY")) {
                        senderRole = " (Secretary)";
                    } else if (roleNames.contains("TREASURER")) {
                        senderRole = " (Treasurer)";
                    } else if (roleNames.contains("SYSTEM_ADMIN")) {
                        senderRole = " (Admin)";
                    } else {
                        String rawRole = roleNames.get(0).replace("_", " ");
                        senderRole = " (" + rawRole.substring(0, 1).toUpperCase() + rawRole.substring(1).toLowerCase() + ")";
                    }
                }
            }
        }
        
        return senderName + senderRole;
    }
}
