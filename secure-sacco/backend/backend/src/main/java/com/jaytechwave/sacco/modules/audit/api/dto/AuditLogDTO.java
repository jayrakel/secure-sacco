package com.jaytechwave.sacco.modules.audit.api.dto;

import com.jaytechwave.sacco.modules.audit.domain.entity.SecurityAuditLog;

import java.time.Instant;
import java.util.UUID;

public record AuditLogDTO(
        UUID id,
        String actor,
        String action,
        String target,
        String ipAddress,
        String details,
        Instant createdAt
) {
    public static AuditLogDTO from(SecurityAuditLog log) {
        return new AuditLogDTO(
                log.getId(),
                log.getActor(),
                log.getAction(),
                log.getTarget(),
                log.getIpAddress(),
                log.getDetails(),
                log.getCreatedAt()
        );
    }
}