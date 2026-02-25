package com.jaytechwave.sacco.modules.core.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class MfaDTOs {
    @Data
    public static class VerifyMfaRequest {
        @NotBlank
        private String code;
    }

    @Data
    public static class MfaLoginRequest {
        @NotBlank
        private String mfaToken;
        @NotBlank
        private String code;
    }
}