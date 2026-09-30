package com.jaytechwave.sacco.modules.core.notifications.api.controller;

import com.jaytechwave.sacco.modules.core.notifications.SystemAlertService;
import com.jaytechwave.sacco.modules.core.notifications.api.dto.SystemAlertDTOs.SystemAlertRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/system-alerts")
@RequiredArgsConstructor
public class SystemAlertController {

    private final SystemAlertService systemAlertService;

    @Value("${sacco.system.alert.api-key:}")
    private String configuredApiKey;

    @PostMapping("/dispatch")
    public ResponseEntity<Void> dispatchAlert(
            @RequestHeader(value = "X-System-Alert-Api-Key", required = false) String providedApiKey,
            @Valid @RequestBody SystemAlertRequest request) {

        if (configuredApiKey == null || configuredApiKey.isBlank()) {
            log.warn("System Alert API Key is not configured on the server. Denying request.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (providedApiKey == null || !configuredApiKey.equals(providedApiKey)) {
            log.warn("Invalid or missing X-System-Alert-Api-Key header.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        systemAlertService.dispatchAlert(request);
        return ResponseEntity.accepted().build();
    }
}
