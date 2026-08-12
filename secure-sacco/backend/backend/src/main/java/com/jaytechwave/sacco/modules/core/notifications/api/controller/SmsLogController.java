package com.jaytechwave.sacco.modules.core.notifications.api.controller;

import com.jaytechwave.sacco.modules.core.notifications.SmsNotificationService;
import com.jaytechwave.sacco.modules.core.notifications.domain.entity.SmsLog;
import com.jaytechwave.sacco.modules.core.notifications.domain.repository.SmsLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sms-logs")
@RequiredArgsConstructor
public class SmsLogController {

    private final SmsLogRepository smsLogRepository;
    private final SmsNotificationService smsNotificationService;

    @GetMapping
    @PreAuthorize("hasAuthority('AUDIT_LOG_READ') or hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<Page<SmsLog>> getSmsLogs(
            @RequestParam(required = false) SmsLog.SmsLogStatus status,
            @RequestParam(required = false) String search,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<SmsLog> logs;
        
        if (status != null && search != null && !search.isBlank()) {
            logs = smsLogRepository.findByStatusAndPhoneNumberContaining(status, search, pageable);
        } else if (status != null) {
            logs = smsLogRepository.findByStatus(status, pageable);
        } else if (search != null && !search.isBlank()) {
            logs = smsLogRepository.findByPhoneNumberContaining(search, pageable);
        } else {
            logs = smsLogRepository.findAll(pageable);
        }
        
        return ResponseEntity.ok(logs);
    }
    
    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAuthority('AUDIT_LOG_READ') or hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<Void> retrySms(@PathVariable UUID id) {
        SmsLog log = smsLogRepository.findById(id).orElseThrow();
        if (log.getStatus() == SmsLog.SmsLogStatus.FAILED) {
            smsNotificationService.retryFailedSms(log);
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/send")
    @PreAuthorize("hasAuthority('AUDIT_LOG_READ') or hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<Void> sendCustomSms(@RequestBody com.jaytechwave.sacco.modules.core.notifications.api.dto.SendSmsRequest request) {
        smsNotificationService.sendNotificationSms(request.getPhoneNumber(), request.getMessage());
        return ResponseEntity.ok().build();
    }
}
