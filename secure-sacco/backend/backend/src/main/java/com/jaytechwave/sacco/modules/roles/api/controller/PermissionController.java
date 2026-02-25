package com.jaytechwave.sacco.modules.roles.api.controller;

import com.jaytechwave.sacco.modules.roles.api.dto.RoleDTOs.PermissionResponse;
import com.jaytechwave.sacco.modules.roles.service.RoleService;
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
public class PermissionController {

    private final RoleService roleService;

    // Both ROLE_READ and ROLE_CREATE require seeing the list of available permissions to assign them
    @PreAuthorize("hasAnyAuthority('ROLE_READ', 'ROLE_CREATE')")
    @GetMapping
    public ResponseEntity<List<PermissionResponse>> getAllPermissions() {
        return ResponseEntity.ok(roleService.getAllPermissions());
    }
}