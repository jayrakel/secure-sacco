package com.jaytechwave.sacco.modules.audit.domain.repository;

import com.jaytechwave.sacco.modules.audit.domain.entity.SecurityAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, UUID> {}