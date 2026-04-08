package com.jaytechwave.sacco.modules.roles.api.controller;

import com.jaytechwave.sacco.modules.roles.api.dto.RoleDTOs.*;
import com.jaytechwave.sacco.modules.roles.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@Tag(name = "Roles", description = "Role and permission management")
public class RoleController {

    private final RoleService roleService;

    @Operation(summary = "List all roles")
    @PreAuthorize("hasAuthority('ROLE_READ')")
    @GetMapping
    public ResponseEntity<List<RoleResponse>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @Operation(summary = "Get role by ID")
    @PreAuthorize("hasAuthority('ROLE_READ')")
    @GetMapping("/{id}")
    public ResponseEntity<RoleResponse> getRoleById(@PathVariable UUID id) {
        return ResponseEntity.ok(roleService.getRoleById(id));
    }

    @Operation(summary = "Create role")
    @PreAuthorize("hasAuthority('ROLE_CREATE')")
    @PostMapping
    public ResponseEntity<RoleResponse> createRole(@Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.createRole(request));
    }

    @Operation(summary = "Update role")
    @PreAuthorize("hasAuthority('ROLE_UPDATE')")
    @PutMapping("/{id}")
    public ResponseEntity<RoleResponse> updateRole(@PathVariable UUID id, @Valid @RequestBody UpdateRoleRequest request) {
        return ResponseEntity.ok(roleService.updateRole(id, request));
    }

    @Operation(summary = "Update role permissions")
    @PreAuthorize("hasAuthority('ROLE_UPDATE')")
    @PutMapping("/{id}/permissions")
    public ResponseEntity<?> updateRolePermissions(@PathVariable UUID id, @Valid @RequestBody UpdateRolePermissionsRequest request) {
        long affectedUsers = roleService.countUsersWithRole(id);
        roleService.updateRolePermissions(id, request.getPermissionIds());
        return ResponseEntity.ok(Map.of(
                "message", "Role permissions updated successfully. " + affectedUsers + " user(s) will need to re-authenticate.",
                "affectedUsers", affectedUsers
        ));
    }

    @Operation(summary = "Delete role")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRole(@PathVariable UUID id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(Map.of("message", "Role deleted successfully"));
    }
}