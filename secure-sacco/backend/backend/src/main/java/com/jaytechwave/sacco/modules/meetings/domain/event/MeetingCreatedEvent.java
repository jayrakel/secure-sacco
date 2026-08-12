package com.jaytechwave.sacco.modules.meetings.domain.event;

import java.util.UUID;

public record MeetingCreatedEvent(UUID meetingId) {
}
