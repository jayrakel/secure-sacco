package com.jaytechwave.sacco.modules.settings.api.controller;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.settings.api.dto.SaccoSettingsDTOs.*;
import com.jaytechwave.sacco.modules.settings.domain.entity.SaccoSettings;
import com.jaytechwave.sacco.modules.settings.domain.service.PrefixGeneratorService;
import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings/sacco")
@RequiredArgsConstructor
public class SaccoSettingsController {

    private final SaccoSettingsService settingsService;
    private final SecurityAuditService auditService;
    private final PrefixGeneratorService prefixGeneratorService; // Injected generator

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> getSettings() {
        if (!settingsService.isInitialized()) {
            return ResponseEntity.ok(Map.of("initialized", false));
        }
        SaccoSettings settings = settingsService.getSettings();
        return ResponseEntity.ok(Map.of(
                "initialized", true,
                "saccoName", settings.getSaccoName(),
                "prefix", settings.getMemberNumberPrefix(),
                "padLength", settings.getMemberNumberPadLength(),
                "registrationFee", settings.getRegistrationFee(), // <--- NEW FIELD ADDED
                "enabledModules", settings.getEnabledModules()
        ));
    }

    // --- NEW: Generate Prefix Preview ---
    @GetMapping("/generate-prefix")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> generatePrefixPreview(@RequestParam String name) {
        String generatedPrefix = prefixGeneratorService.generate(name);
        return ResponseEntity.ok(Map.of("prefix", generatedPrefix));
    }

    @PostMapping("/initialize")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> initializeSettings(@Valid @RequestBody InitializeRequest request, Authentication auth, HttpServletRequest httpRequest) {
        try {
            // Pass the new registrationFee parameter
            SaccoSettings settings = settingsService.initializeSettings(
                    request.getSaccoName(),
                    request.getPrefix(),
                    request.getPadLength(),
                    request.getRegistrationFee() // <--- ADDED
            );

            auditService.logEventWithActorAndIp(auth.getName(), "SETTINGS_INITIALIZED", "Global Settings", getClientIP(httpRequest), "SACCO core settings initialized.");

            return ResponseEntity.ok(settings);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> updateCoreSettings(@Valid @RequestBody UpdateCoreRequest request, Authentication auth, HttpServletRequest httpRequest) {
        // Pass the new registrationFee parameter
        SaccoSettings settings = settingsService.updateCoreSettings(
                request.getSaccoName(),
                request.getPrefix(),
                request.getPadLength(),
                request.getRegistrationFee() // <--- ADDED
        );

        auditService.logEventWithActorAndIp(auth.getName(), "SETTINGS_UPDATED", "Global Settings", getClientIP(httpRequest), "Updated core SACCO settings.");

        return ResponseEntity.ok(Map.of("message", "Settings updated successfully", "settings", settings));
    }

    @PutMapping("/flags")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> updateFeatureFlags(@Valid @RequestBody UpdateFlagsRequest request, Authentication auth, HttpServletRequest httpRequest) {
        SaccoSettings settings = settingsService.updateFeatureFlags(request.getFlags());

        auditService.logEventWithActorAndIp(auth.getName(), "FEATURE_FLAGS_UPDATED", "Global Settings", getClientIP(httpRequest), "Updated module feature flags.");

        return ResponseEntity.ok(Map.of("message", "Feature flags updated successfully", "flags", settings.getEnabledModules()));
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}