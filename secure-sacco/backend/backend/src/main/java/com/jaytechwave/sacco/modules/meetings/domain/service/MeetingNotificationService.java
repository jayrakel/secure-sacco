package com.jaytechwave.sacco.modules.meetings.domain.service;

import com.jaytechwave.sacco.modules.core.notifications.SmsNotificationService;
import com.jaytechwave.sacco.modules.meetings.domain.entity.Meeting;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MeetingNotificationService {

    private final UserRepository userRepository;
    private final SmsNotificationService smsNotificationService;

    public void sendMeetingReminder(Meeting meeting, List<Member> activeMembers) {
        LocalTime now = LocalTime.now();
        String greeting = "Good evening";
        if (now.isBefore(LocalTime.NOON)) {
            greeting = "Good morning";
        } else if (now.isBefore(LocalTime.of(17, 0))) {
            greeting = "Good afternoon";
        }
        sendNotificationsForMeeting(meeting, activeMembers, greeting, false);
    }

    public void sendMeetingUpdateNotification(Meeting meeting, List<Member> activeMembers) {
        LocalTime now = LocalTime.now();
        String greeting = "Good evening";
        if (now.isBefore(LocalTime.NOON)) {
            greeting = "Good morning";
        } else if (now.isBefore(LocalTime.of(17, 0))) {
            greeting = "Good afternoon";
        }
        sendNotificationsForMeeting(meeting, activeMembers, greeting, true);
    }

    private void sendNotificationsForMeeting(Meeting meeting, List<Member> activeMembers, String timeOfDayGreeting, boolean isUpdate) {
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
            
            String baseMessage;
            if (isUpdate) {
                baseMessage = String.format("%s %s, please note the updated details for the  meeting: it will now be held %s at %s. Regards, %s", 
                        timeOfDayGreeting, firstName, datePhrase, formattedTime, signature);
            } else {
                baseMessage = String.format("%s %s, we will be holding a  %s, at %s, make an effort to attend. Regards, %s", 
                        timeOfDayGreeting, firstName, datePhrase, formattedTime, signature);
            }

            int allowedTitleLength = 158 - baseMessage.length();
            String safeTitle = title;
            
            if (allowedTitleLength < 5) {
                // Fallback to "Member" if name is too long
                if (isUpdate) {
                    baseMessage = String.format("%s Member, please note the updated details for the  meeting: it will now be held %s at %s. Regards, %s", 
                            timeOfDayGreeting, datePhrase, formattedTime, signature);
                } else {
                    baseMessage = String.format("%s Member, we will be holding a  %s, at %s, make an effort to attend. Regards, %s", 
                            timeOfDayGreeting, datePhrase, formattedTime, signature);
                }
                allowedTitleLength = 158 - baseMessage.length();
            }

            if (safeTitle.length() > allowedTitleLength && allowedTitleLength >= 3) {
                safeTitle = safeTitle.substring(0, allowedTitleLength - 3) + "...";
            } else if (allowedTitleLength < 3) {
                safeTitle = "";
            }

            String finalMessage;
            if (isUpdate) {
                finalMessage = String.format("%s %s, please note the updated details for the %s meeting: it will now be held %s at %s. Regards, %s", 
                        timeOfDayGreeting, firstName.length() + safeTitle.length() > allowedTitleLength + firstName.length() ? "Member" : firstName, safeTitle, datePhrase, formattedTime, signature);
            } else {
                finalMessage = String.format("%s %s, we will be holding a %s %s, at %s, make an effort to attend. Regards, %s", 
                        timeOfDayGreeting, firstName.length() + safeTitle.length() > allowedTitleLength + firstName.length() ? "Member" : firstName, safeTitle, datePhrase, formattedTime, signature);
            }

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
