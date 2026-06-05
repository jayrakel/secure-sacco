package com.jaytechwave.sacco.modules.audit.service;

import com.jaytechwave.sacco.modules.audit.domain.entity.AuditResult;
import com.jaytechwave.sacco.modules.audit.domain.entity.SecurityAuditLog;
import com.jaytechwave.sacco.modules.audit.domain.repository.SecurityAuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

/**
 * Centralized audit logging service.
 *
 * <p><strong>API overview</strong></p>
 * <ul>
 *   <li>{@link #logEvent(String, String, String)} — legacy, actor+IP from SecurityContext</li>
 *   <li>{@link #logEventWithActorAndIp(String, String, String, String, String)} — legacy explicit actor</li>
 *   <li>{@link #logEvent(String, String, UUID, String, String)} — enriched: entity fields added</li>
 *   <li>{@link #logEvent(String, String, UUID, String, String, String, String)} — enriched + state snapshots</li>
 *   <li>{@link #logSystemEvent(String, String, UUID, String, String, AuditResult)} — system/job actor</li>
 * </ul>
 *
 * <p>Legacy methods remain fully functional — they delegate to the enriched internals
 * with {@code entityType/entityId = null} and {@code result = SUCCESS}.</p>
 */
@Service
@RequiredArgsConstructor
public class SecurityAuditService {

    private final SecurityAuditLogRepository repository;

    // =========================================================================
    // Legacy API — preserved for backward compatibility
    // =========================================================================

    /**
     * Standard log for authenticated requests.
     * Actor and IP are extracted from the Spring Security context and current HTTP request.
     */
    public void logEvent(String action, String target, String details) {
        saveEnriched(
                getCurrentActor(), resolveUserId(), null,
                resolveSessionId(), action, null, AuditResult.SUCCESS,
                null, null, target,
                getCurrentIpAddress(), resolveUserAgent(),
                details, null, null
        );
    }

    /**
     * Explicit-actor log for unauthenticated or system flows
     * (login failures, password reset, background tasks using the old API).
     */
    public void logEventWithActorAndIp(String actor, String action, String target,
                                       String ipAddress, String details) {
        saveEnriched(
                actor != null ? actor : "SYSTEM", null, null,
                null, action, null, AuditResult.SUCCESS,
                null, null, target,
                ipAddress, null,
                details, null, null
        );
    }

    // =========================================================================
    // Enriched API — entity-aware, result-aware
    // =========================================================================

    /**
     * Enriched log for authenticated requests where the entity being acted on is known.
     * Actor, IP, session, and user agent are resolved from context.
     */
    public void logEvent(String action,
                         String entityType,
                         UUID   entityId,
                         String target,
                         String details) {
        saveEnriched(
                getCurrentActor(), resolveUserId(), null,
                resolveSessionId(), action, null, AuditResult.SUCCESS,
                entityType, entityId, target,
                getCurrentIpAddress(), resolveUserAgent(),
                details, null, null
        );
    }

    /**
     * Enriched log with before/after state snapshots.
     * {@code beforeState} and {@code afterState} must be flat JSON strings.
     * Do NOT include PII (passwordHash, raw MSISDN).
     */
    public void logEvent(String action,
                         String entityType,
                         UUID   entityId,
                         String target,
                         String details,
                         String beforeState,
                         String afterState) {
        saveEnriched(
                getCurrentActor(), resolveUserId(), null,
                resolveSessionId(), action, null, AuditResult.SUCCESS,
                entityType, entityId, target,
                getCurrentIpAddress(), resolveUserAgent(),
                details, beforeState, afterState
        );
    }

    /**
     * Enriched log with explicit result (for recording FAILURE outcomes from
     * catch blocks or validation failures).
     */
    public void logEvent(String action,
                         String entityType,
                         UUID   entityId,
                         String target,
                         String details,
                         AuditResult result) {
        saveEnriched(
                getCurrentActor(), resolveUserId(), null,
                resolveSessionId(), action, null, result,
                entityType, entityId, target,
                getCurrentIpAddress(), resolveUserAgent(),
                details, null, null
        );
    }

    /**
     * System-actor event for scheduled jobs and event listeners.
     * Sets actor = "SYSTEM:{callerName}", all request context fields to null.
     *
     * @param systemActor   e.g. "SYSTEM:PenaltyJob"
     * @param entityType    entity class name, or null for bulk summary events
     * @param entityId      entity PK, or null for bulk summary events
     * @param target        human-readable descriptor (job name or module)
     * @param details       summary: counts, duration, errors
     * @param result        SUCCESS or FAILURE
     */
    public void logSystemEvent(String      systemActor,
                               String      entityType,
                               UUID        entityId,
                               String      target,
                               String      details,
                               AuditResult result) {
        saveEnriched(
                systemActor, null, null,
                null, extractActionFromActor(systemActor), null, result,
                entityType, entityId, target,
                null, null,
                details, null, null
        );
    }

    /**
     * Overload allowing the event code to be specified explicitly alongside the system actor.
     */
    public void logSystemEvent(String      systemActor,
                               String      action,
                               String      entityType,
                               UUID        entityId,
                               String      target,
                               String      details,
                               AuditResult result) {
        saveEnriched(
                systemActor, null, null,
                null, action, null, result,
                entityType, entityId, target,
                null, null,
                details, null, null
        );
    }

    // =========================================================================
    // Internal builder
    // =========================================================================

    private void saveEnriched(String actor, UUID userId, UUID memberId,
                               String sessionId, String action, String permissionUsed,
                               AuditResult result,
                               String entityType, UUID entityId, String target,
                               String ipAddress, String userAgent,
                               String details, String beforeState, String afterState) {
        SecurityAuditLog log = SecurityAuditLog.builder()
                .actor(actor != null ? actor : "SYSTEM")
                .userId(userId)
                .memberId(memberId)
                .sessionId(sessionId)
                .action(action)
                .permissionUsed(permissionUsed)
                .result(result != null ? result : AuditResult.SUCCESS)
                .entityType(entityType)
                .entityId(entityId)
                .target(target)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .details(details)
                .beforeState(beforeState)
                .afterState(afterState)
                .build();
        repository.save(log);
    }

    // =========================================================================
    // Context resolution helpers
    // =========================================================================

    private String getCurrentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return auth.getName();
        }
        return "SYSTEM";
    }

    private UUID resolveUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()
                && auth.getPrincipal() instanceof com.jaytechwave.sacco.modules.core.security.CustomUserDetailsService.CustomUserDetails ud) {
            return ud.getId();
        }
        return null;
    }

    private String resolveSessionId() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpSession session = attrs.getRequest().getSession(false);
            return session != null ? session.getId() : null;
        }
        return null;
    }

    private String getCurrentIpAddress() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest req = attrs.getRequest();
            String xf = req.getHeader("X-Forwarded-For");
            if (xf == null || xf.isBlank() || !xf.contains(req.getRemoteAddr())) {
                return req.getRemoteAddr();
            }
            return xf.split(",")[0].trim();
        }
        return null;
    }

    private String resolveUserAgent() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            return attrs.getRequest().getHeader("User-Agent");
        }
        return null;
    }

    /** Strips "SYSTEM:" prefix for use as action in system-event shorthand overload. */
    private String extractActionFromActor(String systemActor) {
        return systemActor != null && systemActor.startsWith("SYSTEM:")
                ? systemActor.substring(7).toUpperCase() + "_RUN"
                : systemActor;
    }
}