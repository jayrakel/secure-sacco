package com.jaytechwave.sacco.modules.audit.api.controller;

import com.jaytechwave.sacco.modules.audit.api.dto.AuditLogDTO;
import com.jaytechwave.sacco.modules.audit.domain.entity.SecurityAuditLog;
import com.jaytechwave.sacco.modules.audit.domain.repository.SecurityAuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@Tag(name = "Audit", description = "Security and operation audit log viewer")
public class AuditController {

    private final SecurityAuditLogRepository auditLogRepository;

    @Operation(summary = "Get audit logs",
            description = "Paginated, filterable audit log. Requires AUDIT_LOG_READ or SYSTEM_ADMIN.")
    @GetMapping("/logs")
    @PreAuthorize("hasAnyAuthority('AUDIT_LOG_READ', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, Object>> getLogs(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false)    String actorEmail,
            @RequestParam(required = false)    String eventType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        Specification<SecurityAuditLog> spec = buildSpec(actorEmail, eventType, from, to);
        PageRequest pageable = PageRequest.of(page, Math.min(size, 200), Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<AuditLogDTO> resultPage = auditLogRepository.findAll(spec, pageable).map(AuditLogDTO::from);

        return ResponseEntity.ok(Map.of(
                "content",       resultPage.getContent(),
                "totalElements", resultPage.getTotalElements(),
                "totalPages",    resultPage.getTotalPages(),
                "page",          resultPage.getNumber(),
                "size",          resultPage.getSize()
        ));
    }

    private Specification<SecurityAuditLog> buildSpec(String actorEmail, String eventType, LocalDate from, LocalDate to) {
        Specification<SecurityAuditLog> spec = Specification.where(null);
        if (actorEmail != null && !actorEmail.isBlank()) {
            String p = "%" + actorEmail.trim().toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.like(cb.lower(root.get("actor")), p));
        }
        if (eventType != null && !eventType.isBlank()) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("action"), eventType.trim().toUpperCase()));
        }
        if (from != null) {
            Instant fi = from.atStartOfDay(ZoneOffset.UTC).toInstant();
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), fi));
        }
        if (to != null) {
            Instant ti = to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            spec = spec.and((root, q, cb) -> cb.lessThan(root.get("createdAt"), ti));
        }
        return spec;
    }
}