package com.jaytechwave.sacco.modules.core.controller;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.core.dto.SessionDTOs.SessionResponse;
import com.jaytechwave.sacco.modules.core.service.SessionService;
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
public class SessionController {

    private final SessionService sessionService;
    private final SecurityAuditService securityAuditService; // --- NEW ---

    @PreAuthorize("hasAuthority('SESSION_READ') or #userId.toString() == authentication.principal.id.toString()")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<SessionResponse>> getUserSessions(@PathVariable UUID userId) {
        return ResponseEntity.ok(sessionService.getUserSessions(userId));
    }

    @PreAuthorize("hasAuthority('SESSION_REVOKE') or #userId.toString() == authentication.principal.id.toString()")
    @DeleteMapping("/user/{userId}")
    public ResponseEntity<?> revokeAllUserSessions(@PathVariable UUID userId) {
        sessionService.revokeAllUserSessions(userId);

        // --- ADDED AUDIT LOG ---
        securityAuditService.logEvent("SESSION_REVOKED_ALL", "Target User ID: " + userId, "Wiped all active sessions");

        return ResponseEntity.ok(Map.of("message", "All active sessions for the user have been revoked."));
    }

    @PreAuthorize("hasAuthority('SESSION_REVOKE')")
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<?> revokeSpecificSession(@PathVariable String sessionId) {
        sessionService.revokeSpecificSession(sessionId);

        // --- ADDED AUDIT LOG ---
        securityAuditService.logEvent("SESSION_REVOKED_SINGLE", "Target Session ID: " + sessionId, "Single session terminated");

        return ResponseEntity.ok(Map.of("message", "Session revoked successfully."));
    }
}