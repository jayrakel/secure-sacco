package com.jaytechwave.sacco.modules.users.api.controller;

import com.jaytechwave.sacco.modules.users.api.dto.UserDTOs.*;
import com.jaytechwave.sacco.modules.users.domain.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User account management, roles, permissions")
public class UserController {

    private final UserService userService;

    @Operation(summary = "List all users")
    @PreAuthorize("hasAuthority('USER_READ')")
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @Operation(summary = "Get user by ID")
    @PreAuthorize("hasAuthority('USER_READ')")
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @Operation(summary = "Create user", description = "Create a new user account and assign roles. Requires USER_CREATE.")
    @PreAuthorize("hasAuthority('USER_CREATE')")
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @Operation(summary = "Update user profile", description = "Update a user's name and phone number. Requires USER_UPDATE.")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    /** Admin email change — separate endpoint so it's audited distinctly. */
    public record ChangeEmailRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Must be a valid email address")
            String newEmail
    ) {}

    @Operation(summary = "Change user email (admin)",
            description = "Changes a user's login email address. The new email must be unique. " +
                    "The user will need to re-verify their email. Requires USER_UPDATE.")
    @PreAuthorize("hasAnyAuthority('USER_UPDATE', 'ROLE_SYSTEM_ADMIN')")
    @PatchMapping("/{id}/email")
    public ResponseEntity<?> changeUserEmail(
            @PathVariable UUID id,
            @Valid @RequestBody ChangeEmailRequest request) {
        userService.changeUserEmail(id, request.newEmail());
        return ResponseEntity.ok(Map.of("message", "Email updated successfully. The user must log in again."));
    }

    @Operation(summary = "Change user status", description = "Suspend or reactivate a user account.")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        userService.updateUserStatus(id, request.getStatus());
        return ResponseEntity.ok(Map.of("message", "User status updated successfully"));
    }

    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @PutMapping("/{id}/roles")
    public ResponseEntity<?> updateUserRoles(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRolesRequest request) {
        userService.updateUserRoles(id, request.getRoleIds());
        return ResponseEntity.ok(Map.of("message", "User roles updated successfully"));
    }

    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}