package com.jaytechwave.sacco.modules.settings.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.settings.api.dto.SaccoSettingsDTOs.*;
import com.jaytechwave.sacco.modules.settings.domain.entity.SaccoSettings;
import com.jaytechwave.sacco.modules.settings.domain.repository.SaccoSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SaccoSettingsService {

    private final SaccoSettingsRepository settingsRepository;
    private final SecurityAuditService securityAuditService;

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SaccoSettings getSettings() {
        return settingsRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("SACCO settings have not been initialized yet."));
    }

    @Transactional(readOnly = true)
    public boolean isInitialized() {
        try {
            return settingsRepository.count() > 0;
        } catch (Exception e) {
            return false;
        }
    }

    // ── One-time initialization ───────────────────────────────────────────────

    @Transactional
    public SaccoSettings initializeSettings(
            String saccoName, String prefix, int padLength,
            BigDecimal registrationFee, String logoUrl, String faviconUrl) {

        if (isInitialized()) {
            throw new IllegalStateException("SACCO settings are already initialized. Use update instead.");
        }

        Map<String, Boolean> initialModules = Map.of(
                "members", true,
                "loans", false,
                "savings", false,
                "reports", false
        );

        SaccoSettings settings = SaccoSettings.builder()
                .saccoName(saccoName)
                .memberNumberPrefix(prefix.toUpperCase())
                .memberNumberPadLength(padLength)
                .registrationFee(registrationFee != null ? registrationFee : new BigDecimal("1000.00"))
                .logoUrl(logoUrl != null ? logoUrl : "")
                .faviconUrl(faviconUrl != null ? faviconUrl : "")
                .enabledModules(initialModules)
                // Security / policy defaults
                .maxLoginAttempts(5)
                .lockoutDurationMinutes(15)
                .sessionTimeoutMinutes(30)
                .passwordResetExpiryMin(15)
                .mfaTokenExpiryMinutes(5)
                .emailVerifyExpiryHours(24)
                .minPasswordLength(12)
                .contactVerifyRateLimit(3)
                .contactVerifyWindowMin(15)
                .rateLimitGeneralPerMin(60)
                // Communication defaults
                .smtpFromName("Secure SACCO")
                .supportEmail("")
                .build();

        SaccoSettings saved = settingsRepository.save(settings);

        securityAuditService.logEvent(
                "SETTINGS_INITIALIZED",
                "SACCO_SETTINGS",
                "SACCO initialized with name: " + saccoName + ", prefix: " + prefix
        );

        return saved;
    }

    // ── Identity update ───────────────────────────────────────────────────────

    @Transactional
    public SaccoSettings updateCoreSettings(
            String saccoName, String prefix, int padLength,
            BigDecimal registrationFee, String logoUrl, String faviconUrl) {

        SaccoSettings s = getSettings();

        if (prefix == null || prefix.length() != 3)
            throw new IllegalArgumentException("Prefix must be exactly 3 characters.");
        if (padLength < 1)
            throw new IllegalArgumentException("Pad length must be at least 1.");
        if (registrationFee != null && registrationFee.compareTo(BigDecimal.ZERO) < 0)
            throw new IllegalArgumentException("Registration fee cannot be negative.");

        s.setSaccoName(saccoName);
        s.setMemberNumberPrefix(prefix.toUpperCase());
        s.setMemberNumberPadLength(padLength);
        if (registrationFee != null) s.setRegistrationFee(registrationFee);
        s.setLogoUrl(logoUrl != null ? logoUrl : "");
        s.setFaviconUrl(faviconUrl != null ? faviconUrl : "");

        SaccoSettings saved = settingsRepository.save(s);

        securityAuditService.logEvent(
                "SETTINGS_UPDATED", "SACCO_SETTINGS",
                "Core identity updated — name: " + saccoName + ", prefix: " + prefix
        );
        return saved;
    }

    // ── Security policy update ────────────────────────────────────────────────

    @Transactional
    public SaccoSettings updateSecurityPolicy(UpdateSecurityPolicyRequest req) {
        SaccoSettings s = getSettings();

        s.setMaxLoginAttempts(req.getMaxLoginAttempts());
        s.setLockoutDurationMinutes(req.getLockoutDurationMinutes());
        s.setSessionTimeoutMinutes(req.getSessionTimeoutMinutes());
        s.setPasswordResetExpiryMin(req.getPasswordResetExpiryMin());
        s.setMfaTokenExpiryMinutes(req.getMfaTokenExpiryMinutes());
        s.setEmailVerifyExpiryHours(req.getEmailVerifyExpiryHours());
        s.setMinPasswordLength(req.getMinPasswordLength());
        s.setContactVerifyRateLimit(req.getContactVerifyRateLimit());
        s.setContactVerifyWindowMin(req.getContactVerifyWindowMin());
        s.setRateLimitGeneralPerMin(req.getRateLimitGeneralPerMin());

        SaccoSettings saved = settingsRepository.save(s);

        securityAuditService.logEvent(
                "SETTINGS_UPDATED", "SACCO_SETTINGS",
                "Security policy updated — maxAttempts: " + req.getMaxLoginAttempts()
                        + ", lockout: " + req.getLockoutDurationMinutes() + " min"
                        + ", minPwdLen: " + req.getMinPasswordLength()
        );
        return saved;
    }

    // ── Communication update ──────────────────────────────────────────────────

    @Transactional
    public SaccoSettings updateCommunication(UpdateCommunicationRequest req) {
        SaccoSettings s = getSettings();
        s.setSmtpFromName(req.getSmtpFromName());
        s.setSupportEmail(req.getSupportEmail() != null ? req.getSupportEmail() : "");
        SaccoSettings saved = settingsRepository.save(s);

        securityAuditService.logEvent(
                "SETTINGS_UPDATED", "SACCO_SETTINGS",
                "Communication settings updated — fromName: " + req.getSmtpFromName()
        );
        return saved;
    }

    // ── Feature flags update ──────────────────────────────────────────────────

    @Transactional
    public SaccoSettings updateFeatureFlags(Map<String, Boolean> enabledModules) {
        SaccoSettings s = getSettings();
        s.setEnabledModules(enabledModules);
        SaccoSettings saved = settingsRepository.save(s);

        securityAuditService.logEvent(
                "SETTINGS_UPDATED", "SACCO_SETTINGS",
                "Feature flags updated: " + enabledModules
        );
        return saved;
    }

    // ── Convenience getters used by security services ─────────────────────────

    public int getMaxLoginAttempts() {
        try { return getSettings().getMaxLoginAttempts(); } catch (Exception e) { return 5; }
    }

    public int getLockoutDurationMinutes() {
        try { return getSettings().getLockoutDurationMinutes(); } catch (Exception e) { return 15; }
    }

    public int getPasswordResetExpiryMin() {
        try { return getSettings().getPasswordResetExpiryMin(); } catch (Exception e) { return 15; }
    }

    public int getMfaTokenExpiryMinutes() {
        try { return getSettings().getMfaTokenExpiryMinutes(); } catch (Exception e) { return 5; }
    }

    public int getEmailVerifyExpiryHours() {
        try { return getSettings().getEmailVerifyExpiryHours(); } catch (Exception e) { return 24; }
    }

    public int getMinPasswordLength() {
        try { return getSettings().getMinPasswordLength(); } catch (Exception e) { return 12; }
    }

    public int getContactVerifyRateLimit() {
        try { return getSettings().getContactVerifyRateLimit(); } catch (Exception e) { return 3; }
    }

    public int getContactVerifyWindowMin() {
        try { return getSettings().getContactVerifyWindowMin(); } catch (Exception e) { return 15; }
    }

    public int getRateLimitGeneralPerMin() {
        try { return getSettings().getRateLimitGeneralPerMin(); } catch (Exception e) { return 60; }
    }

    // ── Savings schedule update ───────────────────────────────────────────────

    @Transactional
    public SaccoSettings updateSavingsSchedule(UpdateSavingsScheduleRequest req) {
        SaccoSettings s = getSettings();
        s.setSavingsDay(req.getSavingsDay().toUpperCase());
        s.setSavingsDeadlineNextDay(req.getSavingsDeadlineNextDay());
        s.setSavingsDeadlineHour(req.getSavingsDeadlineHour());
        s.setSavingsDeadlineMinute(req.getSavingsDeadlineMinute());
        SaccoSettings saved = settingsRepository.save(s);
        securityAuditService.logEvent(
                "SETTINGS_UPDATED", "SACCO_SETTINGS",
                "Savings schedule updated — day: " + req.getSavingsDay()
                        + ", nextDay: " + req.getSavingsDeadlineNextDay()
                        + ", time: " + req.getSavingsDeadlineHour() + ":" + req.getSavingsDeadlineMinute()
        );
        return saved;
    }

    // ── Savings schedule getters (safe — return defaults on error) ────────────

    public String getSavingsDay() {
        try { String d = getSettings().getSavingsDay(); return d != null ? d : "THURSDAY"; }
        catch (Exception e) { return "THURSDAY"; }
    }

    public boolean isSavingsDeadlineNextDay() {
        try { Boolean b = getSettings().getSavingsDeadlineNextDay(); return b != null ? b : true; }
        catch (Exception e) { return true; }
    }

    public int getSavingsDeadlineHour() {
        try { Integer h = getSettings().getSavingsDeadlineHour(); return h != null ? h : 23; }
        catch (Exception e) { return 23; }
    }

    public int getSavingsDeadlineMinute() {
        try { Integer m = getSettings().getSavingsDeadlineMinute(); return m != null ? m : 59; }
        catch (Exception e) { return 59; }
    }
}