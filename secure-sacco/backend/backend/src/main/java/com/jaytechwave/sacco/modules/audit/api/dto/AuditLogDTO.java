package com.jaytechwave.sacco.modules.audit.api.dto;

import com.jaytechwave.sacco.modules.audit.domain.entity.AuditResult;
import com.jaytechwave.sacco.modules.audit.domain.entity.SecurityAuditLog;

import java.time.Instant;
import java.util.UUID;

/**
 * API projection of a {@link SecurityAuditLog} row.
 * All new V79 fields are included. Fields absent from pre-V79 rows will be null.
 */
public record AuditLogDTO(
        UUID        id,
        Instant     createdAt,

        // Actor
        String      actor,
        UUID        userId,
        UUID        memberId,
        String      sessionId,

        // Action
        String      action,
        String      permissionUsed,
        AuditResult result,

        // Entity
        String      entityType,
        UUID        entityId,
        String      target,

        // Context
        String      ipAddress,
        String      userAgent,

        // Detail
        String      details,
        String      beforeState,
        String      afterState
) {
    public static AuditLogDTO from(SecurityAuditLog log) {
        return new AuditLogDTO(
                log.getId(),
                log.getCreatedAt(),
                log.getActor(),
                log.getUserId(),
                log.getMemberId(),
                log.getSessionId(),
                log.getAction(),
                log.getPermissionUsed(),
                log.getResult(),
                log.getEntityType(),
                log.getEntityId(),
                log.getTarget(),
                log.getIpAddress(),
                log.getUserAgent(),
                log.getDetails(),
                log.getBeforeState(),
                log.getAfterState()
        );
    }
}