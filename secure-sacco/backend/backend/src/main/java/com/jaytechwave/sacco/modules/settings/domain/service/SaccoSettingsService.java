package com.jaytechwave.sacco.modules.settings.domain.service;

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

    @Transactional(readOnly = true)
    public SaccoSettings getSettings() {
        return settingsRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("SACCO settings have not been initialized yet."));
    }

    @Transactional(readOnly = true)
    public boolean isInitialized() {
        return settingsRepository.count() > 0;
    }

    @Transactional
    public SaccoSettings initializeSettings(String saccoName, String prefix, int padLength, BigDecimal registrationFee) {
        if (isInitialized()) {
            throw new IllegalStateException("SACCO settings are already initialized. Use update instead.");
        }

        // Default feature flags as requested
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
                .registrationFee(registrationFee != null ? registrationFee : new BigDecimal("1000.00")) // Handle default
                .enabledModules(initialModules)
                .build();

        return settingsRepository.save(settings);
    }

    @Transactional
    public SaccoSettings updateCoreSettings(String saccoName, String prefix, int padLength, BigDecimal registrationFee) {
        SaccoSettings settings = getSettings();

        if (prefix == null || prefix.length() != 3) {
            throw new IllegalArgumentException("Prefix must be exactly 3 characters.");
        }
        if (padLength < 1) {
            throw new IllegalArgumentException("Pad length must be at least 1.");
        }
        if (registrationFee != null && registrationFee.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Registration fee cannot be negative.");
        }

        settings.setSaccoName(saccoName);
        settings.setMemberNumberPrefix(prefix.toUpperCase());
        settings.setMemberNumberPadLength(padLength);

        if (registrationFee != null) {
            settings.setRegistrationFee(registrationFee);
        }

        return settingsRepository.save(settings);
    }

    @Transactional
    public SaccoSettings updateFeatureFlags(Map<String, Boolean> enabledModules) {
        SaccoSettings settings = getSettings();
        settings.setEnabledModules(enabledModules);
        return settingsRepository.save(settings);
    }
}