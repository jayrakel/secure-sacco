package com.jaytechwave.sacco.modules.users.api.dto;

import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public class UserDTOs {

    @Data
    public static class CreateUserRequest {
        @NotBlank(message = "First name is required")
        private String firstName;
        @NotBlank(message = "Last name is required")
        private String lastName;
        @NotBlank(message = "Login email is required")
        @Email(message = "Invalid email format")
        private String email;
        @Email(message = "Invalid official email format")
        private String officialEmail;
        private String phoneNumber;
        @NotBlank(message = "Password is required")
        private String password;
        @NotEmpty(message = "At least one role ID is required")
        private Set<UUID> roleIds;
    }

    @Data
    public static class UpdateUserRequest {
        @NotBlank(message = "First name is required")
        private String firstName;
        @NotBlank(message = "Last name is required")
        private String lastName;
        private String phoneNumber;
    }

    @Data
    public static class UpdateUserStatusRequest {
        @NotNull(message = "Status is required")
        private UserStatus status;
    }

    @Data
    public static class UpdateUserRolesRequest {
        @NotEmpty(message = "At least one role ID is required")
        private Set<UUID> roleIds;
    }

    @Data
    @Builder
    public static class UserResponse {
        private UUID id;
        private String firstName;
        private String lastName;
        private String email;
        private String officialEmail;
        private String phoneNumber;
        private UserStatus status;
        private List<String> roles;
    }
}