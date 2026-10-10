package com.jaytechwave.sacco.modules.core.notifications.domain.service;

import com.jaytechwave.sacco.modules.core.util.SaccoDateUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class MessageTemplateService {

    /**
     * Parses a message template and replaces placeholders with actual values.
     * 
     * Supported placeholders:
     * << Time Greeting >> - Replaced with Good morning, Good afternoon, or Good evening based on Nairobi time.
     * <<Member Name>> - Replaced with the member's first name, or "Member" if null/blank.
     * 
     * @param template The message template
     * @param memberFirstName The member's first name (can be null)
     * @return The parsed message
     */
    public String parseMessage(String template, String memberFirstName) {
        if (template == null || template.isBlank()) {
            return template;
        }

        String parsedMessage = template;

        // Replace Time Greeting
        if (parsedMessage.contains("<< Time Greeting >>")) {
            parsedMessage = parsedMessage.replace("<< Time Greeting >>", getTimeGreeting());
        }

        // Replace Member Name
        if (parsedMessage.contains("<<Member Name>>")) {
            String nameToUse = (memberFirstName != null && !memberFirstName.isBlank()) ? memberFirstName : "Member";
            parsedMessage = parsedMessage.replace("<<Member Name>>", nameToUse);
        }

        return parsedMessage;
    }

    private String getTimeGreeting() {
        LocalDateTime now = LocalDateTime.now(SaccoDateUtils.NAIROBI);
        int hour = now.getHour();

        if (hour >= 0 && hour < 12) {
            return "Good morning";
        } else if (hour >= 12 && hour < 17) {
            return "Good afternoon";
        } else {
            return "Good evening";
        }
    }
}
