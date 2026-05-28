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
    private final PrefixGeneratorService prefixGeneratorService;

    // ── GET ───────────────────────────────────────────────────────────────────

    @Operation(summary = "Get all SACCO settings")
    @GetMapping
    public ResponseEntity<?> getSettings() {
        try {
            if (!settingsService.isInitialized()) {
                return ResponseEntity.ok(Map.of("initialized", false));
            }
            SaccoSettings s = settingsService.getSettings();
            return ResponseEntity.ok(Map.ofEntries(
                    // Meta
                    Map.entry("initialized", true),
                    // Identity
                    Map.entry("saccoName",      s.getSaccoName()),
                    Map.entry("prefix",         s.getMemberNumberPrefix()),
                    Map.entry("padLength",      s.getMemberNumberPadLength()),
                    Map.entry("registrationFee",s.getRegistrationFee()),
                    Map.entry("logoUrl",        s.getLogoUrl()     != null ? s.getLogoUrl()     : ""),
                    Map.entry("faviconUrl",     s.getFaviconUrl()  != null ? s.getFaviconUrl()  : ""),
                    // Communication
                    Map.entry("smtpFromName",   s.getSmtpFromName()  != null ? s.getSmtpFromName()  : "Secure SACCO"),
                    Map.entry("supportEmail",   s.getSupportEmail()  != null ? s.getSupportEmail()  : ""),
                    // Security policy
                    Map.entry("maxLoginAttempts",        s.getMaxLoginAttempts()),
                    Map.entry("lockoutDurationMinutes",  s.getLockoutDurationMinutes()),
                    Map.entry("sessionTimeoutMinutes",   s.getSessionTimeoutMinutes()),
                    Map.entry("passwordResetExpiryMin",  s.getPasswordResetExpiryMin()),
                    Map.entry("mfaTokenExpiryMinutes",   s.getMfaTokenExpiryMinutes()),
                    Map.entry("emailVerifyExpiryHours",  s.getEmailVerifyExpiryHours()),
                    Map.entry("minPasswordLength",       s.getMinPasswordLength()),
                    Map.entry("contactVerifyRateLimit",  s.getContactVerifyRateLimit()),
                    Map.entry("contactVerifyWindowMin",  s.getContactVerifyWindowMin()),
                    Map.entry("rateLimitGeneralPerMin",  s.getRateLimitGeneralPerMin()),
                    // Savings schedule
                    Map.entry("savingsDay",              s.getSavingsDay()             != null ? s.getSavingsDay()             : "THURSDAY"),
                    Map.entry("savingsDeadlineNextDay",  s.getSavingsDeadlineNextDay() != null ? s.getSavingsDeadlineNextDay() : true),
                    Map.entry("savingsDeadlineHour",     s.getSavingsDeadlineHour()    != null ? s.getSavingsDeadlineHour()    : 23),
                    Map.entry("savingsDeadlineMinute",   s.getSavingsDeadlineMinute()  != null ? s.getSavingsDeadlineMinute()  : 59),
                    // Modules
                    Map.entry("enabledModules", s.getEnabledModules())
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("initialized", false, "error", "Failed to retrieve settings: " + e.getMessage()));
        }
    }

    @Operation(summary = "Preview member number prefix auto-generation")
    @GetMapping("/generate-prefix")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> generatePrefixPreview(@RequestParam String name) {
        return ResponseEntity.ok(Map.of("prefix", prefixGeneratorService.generate(name)));
    }

    // ── Identity ──────────────────────────────────────────────────────────────

    @Operation(summary = "Initialize SACCO (one-time setup)")
    @PostMapping("/initialize")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> initializeSettings(
            @Valid @RequestBody InitializeRequest req,
            Authentication auth, HttpServletRequest httpReq) {
        try {
            SaccoSettings settings = settingsService.initializeSettings(
                    req.getSaccoName(), req.getPrefix(), req.getPadLength(),
                    req.getRegistrationFee(), req.getLogoUrl(), req.getFaviconUrl());
            auditService.logEventWithActorAndIp(auth.getName(), "SETTINGS_INITIALIZED",
                    "Global Settings", getClientIP(httpReq), "SACCO core settings initialized.");
            return ResponseEntity.ok(settings);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Update SACCO identity & financial settings")
    @PutMapping
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> updateCoreSettings(
            @Valid @RequestBody UpdateCoreRequest req,
            Authentication auth, HttpServletRequest httpReq) {
        SaccoSettings settings = settingsService.updateCoreSettings(
                req.getSaccoName(), req.getPrefix(), req.getPadLength(),
                req.getRegistrationFee(), req.getLogoUrl(), req.getFaviconUrl());
        auditService.logEventWithActorAndIp(auth.getName(), "SETTINGS_UPDATED",
                "Global Settings", getClientIP(httpReq), "Updated core SACCO settings.");
        return ResponseEntity.ok(Map.of("message", "Settings updated successfully", "settings", settings));
    }

    // ── Security policy ───────────────────────────────────────────────────────

    @Operation(summary = "Update security policy settings",
            description = "Controls login lockout, session lifetime, password rules, token TTLs and rate limits.")
    @PutMapping("/security")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> updateSecurityPolicy(
            @Valid @RequestBody UpdateSecurityPolicyRequest req,
            Authentication auth, HttpServletRequest httpReq) {
        SaccoSettings settings = settingsService.updateSecurityPolicy(req);
        auditService.logEventWithActorAndIp(auth.getName(), "SECURITY_POLICY_UPDATED",
                "Global Settings", getClientIP(httpReq), "Security policy updated.");
        return ResponseEntity.ok(Map.of("message", "Security policy updated.", "settings", settings));
    }

    // ── Communication ─────────────────────────────────────────────────────────

    @Operation(summary = "Update communication / email settings")
    @PutMapping("/communication")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> updateCommunication(
            @Valid @RequestBody UpdateCommunicationRequest req,
            Authentication auth, HttpServletRequest httpReq) {
        SaccoSettings settings = settingsService.updateCommunication(req);
        auditService.logEventWithActorAndIp(auth.getName(), "COMMUNICATION_SETTINGS_UPDATED",
                "Global Settings", getClientIP(httpReq), "Communication settings updated.");
        return ResponseEntity.ok(Map.of("message", "Communication settings updated.", "settings", settings));
    }

    // ── Feature flags ─────────────────────────────────────────────────────────

    @Operation(summary = "Update feature flags", description = "Enable or disable SACCO modules.")
    @PutMapping("/flags")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> updateFeatureFlags(
            @Valid @RequestBody UpdateFlagsRequest req,
            Authentication auth, HttpServletRequest httpReq) {
        SaccoSettings settings = settingsService.updateFeatureFlags(req.getFlags());
        auditService.logEventWithActorAndIp(auth.getName(), "FEATURE_FLAGS_UPDATED",
                "Global Settings", getClientIP(httpReq), "Module feature flags updated.");
        return ResponseEntity.ok(Map.of("message", "Feature flags updated.", "flags", settings.getEnabledModules()));
    }

    // ── Util ──────────────────────────────────────────────────────────────────

    private String getClientIP(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf == null || xf.isEmpty() || !xf.contains(request.getRemoteAddr()))
            return request.getRemoteAddr();
        return xf.split(",")[0];
    }

    // ── Savings schedule ──────────────────────────────────────────────────────

    @Operation(summary = "Update savings day and deadline settings")
    @PutMapping("/savings-schedule")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<?> updateSavingsSchedule(
            @Valid @RequestBody UpdateSavingsScheduleRequest req) {
        try {
            SaccoSettings s = settingsService.updateSavingsSchedule(req);
            return ResponseEntity.ok(Map.of(
                    "savingsDay",             s.getSavingsDay(),
                    "savingsDeadlineNextDay", s.getSavingsDeadlineNextDay(),
                    "savingsDeadlineHour",    s.getSavingsDeadlineHour(),
                    "savingsDeadlineMinute",  s.getSavingsDeadlineMinute()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}