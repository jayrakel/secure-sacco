package com.jaytechwave.sacco.modules.roles.api.controller;

import com.jaytechwave.sacco.modules.roles.api.dto.RoleDTOs.*;
import com.jaytechwave.sacco.modules.roles.service.RoleService;
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
public class RoleController {

    private final RoleService roleService;

    @PreAuthorize("hasAuthority('ROLE_READ')")
    @GetMapping
    public ResponseEntity<List<RoleResponse>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @PreAuthorize("hasAuthority('ROLE_READ')")
    @GetMapping("/{id}")
    public ResponseEntity<RoleResponse> getRoleById(@PathVariable UUID id) {
        return ResponseEntity.ok(roleService.getRoleById(id));
    }

    @PreAuthorize("hasAuthority('ROLE_CREATE')")
    @PostMapping
    public ResponseEntity<RoleResponse> createRole(@Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.createRole(request));
    }

    @PreAuthorize("hasAuthority('ROLE_UPDATE')")
    @PutMapping("/{id}/permissions")
    public ResponseEntity<?> updateRolePermissions(@PathVariable UUID id, @Valid @RequestBody UpdateRolePermissionsRequest request) {
        roleService.updateRolePermissions(id, request.getPermissionIds());
        return ResponseEntity.ok(Map.of("message", "Role permissions updated successfully"));
    }
}