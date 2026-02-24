package com.jaytechwave.sacco.modules.core.controller;

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

    @PreAuthorize("hasAuthority('SESSION_READ')")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<SessionResponse>> getUserSessions(@PathVariable UUID userId) {
        return ResponseEntity.ok(sessionService.getUserSessions(userId));
    }

    @PreAuthorize("hasAuthority('SESSION_REVOKE')")
    @DeleteMapping("/user/{userId}")
    public ResponseEntity<?> revokeAllUserSessions(@PathVariable UUID userId) {
        sessionService.revokeAllUserSessions(userId);
        return ResponseEntity.ok(Map.of("message", "All active sessions for the user have been revoked."));
    }

    @PreAuthorize("hasAuthority('SESSION_REVOKE')")
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<?> revokeSpecificSession(@PathVariable String sessionId) {
        sessionService.revokeSpecificSession(sessionId);
        return ResponseEntity.ok(Map.of("message", "Session revoked successfully."));
    }
}