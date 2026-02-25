package com.jaytechwave.sacco.modules.roles.service;

import com.jaytechwave.sacco.modules.roles.api.dto.RoleDTOs.*;
import com.jaytechwave.sacco.modules.roles.domain.entity.Permission;
import com.jaytechwave.sacco.modules.roles.domain.entity.Role;
import com.jaytechwave.sacco.modules.roles.domain.repository.PermissionRepository;
import com.jaytechwave.sacco.modules.roles.domain.repository.RoleRepository;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final SecurityAuditService securityAuditService;

    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(this::mapToRoleResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoleResponse getRoleById(UUID id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));
        return mapToRoleResponse(role);
    }

    @Transactional
    public RoleResponse createRole(CreateRoleRequest request) {
        String roleName = request.getName().trim().toUpperCase();

        if (roleRepository.findByName(roleName).isPresent()) {
            throw new IllegalArgumentException("Role name already exists");
        }

        Set<Permission> permissions = new HashSet<>();
        if (request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()) {
            permissions.addAll(permissionRepository.findAllById(request.getPermissionIds()));
        }

        Role role = Role.builder()
                .name(roleName)
                .description(request.getDescription())
                .permissions(permissions)
                .build();

        // Save the role first so we get the DB-generated properties
        Role savedRole = roleRepository.save(role);

        // --- ADDED AUDIT LOG ---
        securityAuditService.logEvent(
                "ROLE_CREATED",
                "Role: " + savedRole.getName(),
                "Created role with description: " + savedRole.getDescription()
        );

        return mapToRoleResponse(savedRole);
    }

    @Transactional
    public void updateRolePermissions(UUID roleId, Set<UUID> permissionIds) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        // Prevent modification of the SYSTEM_ADMIN role to avoid lockouts
        if ("SYSTEM_ADMIN".equals(role.getName())) {
            throw new IllegalStateException("Cannot modify permissions for SYSTEM_ADMIN");
        }

        Set<Permission> newPermissions = new HashSet<>(permissionRepository.findAllById(permissionIds));
        if (newPermissions.isEmpty()) {
            throw new IllegalArgumentException("Valid permissions must be provided");
        }

        role.setPermissions(newPermissions);
        Role savedRole = roleRepository.save(role);

        // --- ADDED AUDIT LOG ---
        securityAuditService.logEvent(
                "PERMISSIONS_UPDATED",
                "Role: " + savedRole.getName(),
                "Assigned " + newPermissions.size() + " permissions"
        );
    }

    // --- READ-ONLY PERMISSIONS ---

    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(this::mapToPermissionResponse)
                .collect(Collectors.toList());
    }

    // --- MAPPERS ---

    private RoleResponse mapToRoleResponse(Role role) {
        List<PermissionResponse> permissions = role.getPermissions().stream()
                .map(this::mapToPermissionResponse)
                .collect(Collectors.toList());

        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(permissions)
                .build();
    }

    private PermissionResponse mapToPermissionResponse(Permission permission) {
        return PermissionResponse.builder()
                .id(permission.getId())
                .code(permission.getCode())
                .description(permission.getDescription())
                .build();
    }
}