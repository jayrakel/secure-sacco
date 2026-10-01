package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.core.api.dto.SessionDTOs.SessionResponse;
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
                .map(session -> {
                    String ip = session.getAttribute("clientIp");
                    String ua = session.getAttribute("userAgent");
                    
                    String os = "Unknown OS";
                    String browser = "Unknown Browser";
                    
                    if (ua != null) {
                        if (ua.contains("Windows")) os = "Windows";
                        else if (ua.contains("Mac OS X")) os = "macOS";
                        else if (ua.contains("Linux")) os = "Linux";
                        else if (ua.contains("Android")) os = "Android";
                        else if (ua.contains("iPhone") || ua.contains("iPad")) os = "iOS";
                        
                        if (ua.contains("Edg/")) browser = "Edge";
                        else if (ua.contains("Chrome/")) browser = "Chrome";
                        else if (ua.contains("Firefox/")) browser = "Firefox";
                        else if (ua.contains("Safari/") && !ua.contains("Chrome")) browser = "Safari";
                    }

                    return SessionResponse.builder()
                        .sessionId(session.getId())
                        .creationTime(session.getCreationTime())
                        .lastAccessedTime(session.getLastAccessedTime())
                        .isExpired(session.isExpired())
                        .ipAddress(ip)
                        .os(os)
                        .browser(browser)
                        .location(ip != null ? "Location lookup pending" : "Unknown")
                        .build();
                })
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