package com.jaytechwave.sacco.modules.settings.api.controller;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.settings.api.dto.SaccoSettingsDTOs.*;
import com.jaytechwave.sacco.modules.settings.domain.entity.SaccoSettings;
import com.jaytechwave.sacco.modules.settings.domain.service.PrefixGeneratorService;
import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Settings", description = "SACCO configuration and feature flags")
public class SaccoSettingsController {

    private final SaccoSettingsService settingsService;
    private final SecurityAuditService auditService;
    private final PrefixGeneratorService prefixGeneratorService; // Injected generator

    @Operation(summary = "Get SACCO settings")
    @GetMapping
    public ResponseEntity<?> getSettings() {
        try {
            if (!settingsService.isInitialized()) {
                return ResponseEntity.ok(Map.of("initialized", false));
            }
            SaccoSettings settings = settingsService.getSettings();
            return ResponseEntity.ok(Map.of(
                    "initialized", true,
                    "saccoName", settings.getSaccoName(),
                    "prefix", settings.getMemberNumberPrefix(),
                    "padLength", settings.getMemberNumberPadLength(),
                    "registrationFee", settings.getRegistrationFee(),
                    "logoUrl", settings.getLogoUrl() != null ? settings.getLogoUrl() : "",
                    "faviconUrl", settings.getFaviconUrl() != null ? settings.getFaviconUrl() : "",
                    "enabledModules", settings.getEnabledModules()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "initialized", false,
                    "error", "Failed to retrieve settings: " + e.getMessage()
            ));
        }
    }

    // --- NEW: Generate Prefix Preview ---
    @Operation(summary = "Preview member number prefix")
    @GetMapping("/generate-prefix")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> generatePrefixPreview(@RequestParam String name) {
        String generatedPrefix = prefixGeneratorService.generate(name);
        return ResponseEntity.ok(Map.of("prefix", generatedPrefix));
    }

    @Operation(summary = "Initialize SACCO settings", description = "One-time setup of core SACCO configuration. Requires SYSTEM_ADMIN.")
    @PostMapping("/initialize")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> initializeSettings(@Valid @RequestBody InitializeRequest request, Authentication auth, HttpServletRequest httpRequest) {
        try {
            // Pass the new registrationFee parameter
            SaccoSettings settings = settingsService.initializeSettings(
                    request.getSaccoName(),
                    request.getPrefix(),
                    request.getPadLength(),
                    request.getRegistrationFee(), // <--- ADDED
                    request.getLogoUrl(),
                    request.getFaviconUrl()
            );

            auditService.logEventWithActorAndIp(auth.getName(), "SETTINGS_INITIALIZED", "Global Settings", getClientIP(httpRequest), "SACCO core settings initialized.");

            return ResponseEntity.ok(settings);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Update core settings")
    @PutMapping
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> updateCoreSettings(@Valid @RequestBody UpdateCoreRequest request, Authentication auth, HttpServletRequest httpRequest) {
        // Pass the new registrationFee parameter
        SaccoSettings settings = settingsService.updateCoreSettings(
                request.getSaccoName(),
                request.getPrefix(),
                request.getPadLength(),
                request.getRegistrationFee(), // <--- ADDED
                request.getLogoUrl(),
                request.getFaviconUrl()
        );

        auditService.logEventWithActorAndIp(auth.getName(), "SETTINGS_UPDATED", "Global Settings", getClientIP(httpRequest), "Updated core SACCO settings.");

        return ResponseEntity.ok(Map.of("message", "Settings updated successfully", "settings", settings));
    }

    @Operation(summary = "Update feature flags", description = "Enable or disable SACCO modules.")
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