package com.jaytechwave.sacco.modules.core.controller;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.core.api.dto.SessionDTOs.SessionResponse;
import com.jaytechwave.sacco.modules.core.service.SessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@Tag(name = "Sessions", description = "Active session visibility and remote revocation")
public class SessionController {

    private final SessionService sessionService;
    private final SecurityAuditService securityAuditService; // --- NEW ---

    @Operation(summary = "List user sessions", description = "Returns all active sessions for a user. Staff with SESSION_READ or the user themselves.")
    @PreAuthorize("hasAuthority('SESSION_READ') or #userId.toString() == authentication.principal.id.toString()")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<SessionResponse>> getUserSessions(@PathVariable UUID userId) {
        return ResponseEntity.ok(sessionService.getUserSessions(userId));
    }

    @Operation(summary = "Revoke all user sessions", description = "Terminates every active session for a user. Staff with SESSION_REVOKE or the user themselves.")
    @PreAuthorize("hasAuthority('SESSION_REVOKE') or #userId.toString() == authentication.principal.id.toString()")
    @DeleteMapping("/user/{userId}")
    public ResponseEntity<?> revokeAllUserSessions(@PathVariable UUID userId) {
        sessionService.revokeAllUserSessions(userId);

        // --- ADDED AUDIT LOG ---
        securityAuditService.logEvent("SESSION_REVOKED_ALL", "Target User ID: " + userId, "Wiped all active sessions");

        return ResponseEntity.ok(Map.of("message", "All active sessions for the user have been revoked."));
    }

    @Operation(summary = "Revoke a specific session", description = "Terminates a single session by ID. Requires SESSION_REVOKE.")
    @PreAuthorize("hasAuthority('SESSION_REVOKE')")
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<?> revokeSpecificSession(@PathVariable String sessionId) {
        sessionService.revokeSpecificSession(sessionId);

        // --- ADDED AUDIT LOG ---
        securityAuditService.logEvent("SESSION_REVOKED_SINGLE", "Target Session ID: " + sessionId, "Single session terminated");

        return ResponseEntity.ok(Map.of("message", "Session revoked successfully."));
    }
}