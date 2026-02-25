package com.jaytechwave.sacco.modules.audit.service;

import com.jaytechwave.sacco.modules.audit.domain.entity.SecurityAuditLog;
import com.jaytechwave.sacco.modules.audit.domain.repository.SecurityAuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
public class SecurityAuditService {
    private final SecurityAuditLogRepository repository;

    // Standard log for authenticated users
    public void logEvent(String action, String target, String details) {
        logEventWithActorAndIp(getCurrentActor(), action, target, getCurrentIpAddress(), details);
    }

    // Explicit log for unauthenticated/failed events (where SecurityContext is empty)
    public void logEventWithActorAndIp(String actor, String action, String target, String ipAddress, String details) {
        SecurityAuditLog log = SecurityAuditLog.builder()
                .actor(actor != null ? actor : "SYSTEM")
                .action(action)
                .target(target)
                .ipAddress(ipAddress)
                .details(details)
                .build();
        repository.save(log);
    }

    private String getCurrentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            return authentication.getName();
        }
        return "SYSTEM";
    }

    private String getCurrentIpAddress() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String xfHeader = request.getHeader("X-Forwarded-For");
            if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
                return request.getRemoteAddr();
            }
            return xfHeader.split(",")[0];
        }
        return "UNKNOWN";
    }
}