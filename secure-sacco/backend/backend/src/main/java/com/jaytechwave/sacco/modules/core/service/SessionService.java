package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.core.dto.SessionDTOs.SessionResponse;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionService {

    // This repository is automatically provided by Spring Session Redis
    private final FindByIndexNameSessionRepository<? extends Session> sessionRepository;
    private final UserRepository userRepository;

    public List<SessionResponse> getUserSessions(UUID userId) {
        User user = getUserById(userId);

        // Spring Session automatically indexes sessions by the Principal's name (Email)
        Map<String, ? extends Session> sessions = sessionRepository.findByPrincipalName(user.getEmail());

        return sessions.values().stream()
                .map(session -> SessionResponse.builder()
                        .sessionId(session.getId())
                        .creationTime(session.getCreationTime())
                        .lastAccessedTime(session.getLastAccessedTime())
                        .isExpired(session.isExpired())
                        .build())
                .collect(Collectors.toList());
    }

    public void revokeAllUserSessions(UUID userId) {
        User user = getUserById(userId);

        Map<String, ? extends Session> sessions = sessionRepository.findByPrincipalName(user.getEmail());

        // Delete each active session from Redis
        for (Session session : sessions.values()) {
            sessionRepository.deleteById(session.getId());
        }
    }

    public void revokeSpecificSession(String sessionId) {
        sessionRepository.deleteById(sessionId);
    }

    private User getUserById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}