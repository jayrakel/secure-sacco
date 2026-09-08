package com.jaytechwave.sacco.modules.maintenance.api.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class SystemMaintenanceDTOs {

    @Data
    public static class CreateMaintenanceRequest {
        @NotBlank(message = "Title is required")
        private String title;

        @NotBlank(message = "Description is required")
        private String description;

        @NotNull(message = "Start time is required")
        @Future(message = "Start time must be in the future")
        private LocalDateTime maintenanceStartTime;

        @NotNull(message = "End time is required")
        @Future(message = "End time must be in the future")
        private LocalDateTime maintenanceEndTime;

        private boolean notifyMembersApp = true;
        private boolean notifyMembersSms = false;
        private boolean notifyMembersEmail = false;
    }

    @Data
    public static class MaintenanceResponse {
        private UUID id;
        private String title;
        private String description;
        private LocalDateTime maintenanceStartTime;
        private LocalDateTime maintenanceEndTime;
        private boolean notifyMembersApp;
        private boolean notifyMembersSms;
        private boolean notifyMembersEmail;
        private boolean membersNotified;
        private boolean adminReminded;
    }
}
