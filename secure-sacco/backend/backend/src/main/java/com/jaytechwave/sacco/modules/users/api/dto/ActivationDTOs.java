package com.jaytechwave.sacco.modules.users.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class ActivationDTOs {

    @Data
    public static class RequestTokenPayload {
        @NotBlank(message = "Email is required to identify the account")
        @Email
        private String email;
    }

    @Data
    public static class VerifyOtpPayload {
        @NotBlank
        @Email
        private String email;
        @NotBlank
        private String code;
    }

    @Data
    public static class VerifyEmailPayload {
        @NotBlank
        private String token;
        @NotBlank(message = "You must set your initial password during email verification")
        private String newPassword;
    }
}