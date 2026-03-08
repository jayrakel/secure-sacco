package com.jaytechwave.sacco.modules.roles.api.controller;

import com.jaytechwave.sacco.modules.roles.api.dto.RoleDTOs.PermissionResponse;
import com.jaytechwave.sacco.modules.roles.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
@Tag(name = "Roles", description = "Role and permission management")
public class PermissionController {

    private final RoleService roleService;

    @Operation(summary = "List all permissions", description = "Returns the full permission catalogue for use in role assignment.")
    @PreAuthorize("hasAnyAuthority('ROLE_READ', 'ROLE_CREATE')")
    @GetMapping
    public ResponseEntity<List<PermissionResponse>> getAllPermissions() {
        return ResponseEntity.ok(roleService.getAllPermissions());
    }
}