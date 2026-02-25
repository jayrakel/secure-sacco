package com.jaytechwave.sacco.modules.settings.domain.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeatureFlagService {

    private final SaccoSettingsService settingsService;

    @Transactional(readOnly = true)
    public boolean isModuleEnabled(String moduleName) {
        if (!settingsService.isInitialized()) {
            return false;
        }
        return settingsService.getSettings().getEnabledModules().getOrDefault(moduleName, false);
    }
}