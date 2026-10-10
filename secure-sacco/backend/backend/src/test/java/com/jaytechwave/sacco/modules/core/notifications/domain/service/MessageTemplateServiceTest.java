package com.jaytechwave.sacco.modules.core.notifications.domain.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MessageTemplateServiceTest {

    private MessageTemplateService templateService;

    @BeforeEach
    void setUp() {
        templateService = new MessageTemplateService();
    }

    @Test
    void parseMessage_shouldReplaceMemberName() {
        String template = "Hello <<Member Name>>, your balance is ready.";
        String parsed = templateService.parseMessage(template, "John");
        assertEquals("Hello John, your balance is ready.", parsed);
    }

    @Test
    void parseMessage_shouldFallbackToMemberWhenNameIsNull() {
        String template = "Hello <<Member Name>>, your balance is ready.";
        String parsed = templateService.parseMessage(template, null);
        assertEquals("Hello Member, your balance is ready.", parsed);
    }

    @Test
    void parseMessage_shouldFallbackToMemberWhenNameIsBlank() {
        String template = "Hello <<Member Name>>, your balance is ready.";
        String parsed = templateService.parseMessage(template, "   ");
        assertEquals("Hello Member, your balance is ready.", parsed);
    }

    @Test
    void parseMessage_shouldReplaceTimeGreeting() {
        String template = "<< Time Greeting >> <<Member Name>>, this is a reminder.";
        String parsed = templateService.parseMessage(template, "Jane");
        
        // The exact time greeting depends on when the test is run,
        // so we check that it's one of the valid options and the name is replaced.
        assertTrue(parsed.startsWith("Good morning Jane,") || 
                   parsed.startsWith("Good afternoon Jane,") || 
                   parsed.startsWith("Good evening Jane,"));
    }

    @Test
    void parseMessage_shouldHandleNullTemplate() {
        assertNull(templateService.parseMessage(null, "John"));
    }
}
