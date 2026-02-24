package com.jaytechwave.sacco.modules.core.dto;

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
    }
}