package com.jaytechwave.sacco.modules.roles.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public class RoleDTOs {

    @Data
    public static class CreateRoleRequest {
        @NotBlank(message = "Role name is required")
        private String name;
        private String description;
        private Set<UUID> permissionIds;
    }

    @Data
    public static class UpdateRolePermissionsRequest {
        @NotEmpty(message = "At least one permission ID is required")
        private Set<UUID> permissionIds;
    }

    @Data
    @Builder
    public static class RoleResponse {
        private UUID id;
        private String name;
        private String description;
        private List<PermissionResponse> permissions;
    }

    @Data
    @Builder
    public static class PermissionResponse {
        private UUID id;
        private String code;
        private String description;
    }
}