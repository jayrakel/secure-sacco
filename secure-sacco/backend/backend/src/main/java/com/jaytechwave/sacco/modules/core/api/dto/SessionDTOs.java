package com.jaytechwave.sacco.modules.core.api.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

public class SessionDTOs {

    @Data
    @Builder
    public static class SessionResponse {
        private String sessionId;
        private Instant creationTime;
        private Instant lastAccessedTime;
        private boolean isExpired;
        private String os;
        private String browser;
        private String ipAddress;
        private String location;
    }
}