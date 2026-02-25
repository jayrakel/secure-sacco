package com.jaytechwave.sacco.modules.settings.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

public class SaccoSettingsDTOs {

    @Data
    public static class InitializeRequest {
        @NotBlank(message = "SACCO Name is required")
        private String saccoName;

        @NotBlank(message = "Prefix is required")
        @Size(min = 3, max = 3, message = "Prefix must be exactly 3 characters")
        private String prefix;

        @Min(value = 1, message = "Pad length must be at least 1")
        private int padLength = 7;
    }

    @Data
    public static class UpdateCoreRequest {
        @NotBlank(message = "SACCO Name is required")
        private String saccoName;

        @NotBlank(message = "Prefix is required")
        @Size(min = 3, max = 3, message = "Prefix must be exactly 3 characters")
        private String prefix;

        @Min(value = 1, message = "Pad length must be at least 1")
        private int padLength;
    }

    @Data
    public static class UpdateFlagsRequest {
        @NotNull(message = "Flags map cannot be null")
        private Map<String, Boolean> flags;
    }
}