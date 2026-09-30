package com.jaytechwave.sacco.modules.core.notifications.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class SystemAlertDTOs {

    @Data
    public static class SystemAlertRequest {
        @NotBlank(message = "Source is required")
        private String source;

        @NotBlank(message = "Service is required")
        private String service;

        @NotBlank(message = "Severity is required")
        private String severity; // INFO, WARNING, ERROR, CRITICAL

        @NotBlank(message = "Message is required")
        private String message;
    }
}
