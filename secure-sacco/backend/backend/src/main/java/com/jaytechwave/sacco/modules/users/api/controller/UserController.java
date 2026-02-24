package com.jaytechwave.sacco.modules.users.api.controller;

import com.jaytechwave.sacco.modules.users.api.dto.UserDTOs.*;
import com.jaytechwave.sacco.modules.users.domain.service.UserService;
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
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PreAuthorize("hasAuthority('USER_READ')")
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PreAuthorize("hasAuthority('USER_READ')")
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PreAuthorize("hasAuthority('USER_CREATE')")
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    // PATCH for suspending or activating accounts
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateUserStatus(@PathVariable UUID id, @Valid @RequestBody UpdateUserStatusRequest request) {
        userService.updateUserStatus(id, request.getStatus());
        return ResponseEntity.ok(Map.of("message", "User status updated successfully"));
    }

    // PUT for assigning roles
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @PutMapping("/{id}/roles")
    public ResponseEntity<?> updateUserRoles(@PathVariable UUID id, @Valid @RequestBody UpdateUserRolesRequest request) {
        userService.updateUserRoles(id, request.getRoleIds());
        return ResponseEntity.ok(Map.of("message", "User roles updated successfully"));
    }

    // DELETE for soft deleting
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}