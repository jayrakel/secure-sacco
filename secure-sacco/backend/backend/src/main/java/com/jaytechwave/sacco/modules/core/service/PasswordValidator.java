package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * Validates passwords against configurable rules.
 *
 * <p>Minimum length is read dynamically from {@link SaccoSettingsService} so
 * the admin can change it via the settings panel without redeploying.
 * All other structural requirements (upper, lower, digit, special char) are fixed.</p>
 */
@Service
public class PasswordValidator {

    private static final int DEFAULT_MIN_LENGTH = 12;

    /**
     * Base pattern — deliberately has NO minimum-length quantifier.
     * Length is checked separately using the configurable setting.
     */
    private static final String BASE_PATTERN =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_\\-.#])[A-Za-z\\d@$!%*?&_\\-.#]+$";

    private static final Pattern BASE_COMPILED = Pattern.compile(BASE_PATTERN);

    private final SaccoSettingsService settingsService;

    @Autowired
    public PasswordValidator(@Lazy SaccoSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    private int minLength() {
        try {
            int v = settingsService.getMinPasswordLength();
            return v >= 8 ? v : DEFAULT_MIN_LENGTH;
        } catch (Exception e) {
            return DEFAULT_MIN_LENGTH;
        }
    }

    public boolean isValid(String password) {
        if (password == null) return false;
        if (password.length() < minLength()) return false;
        return BASE_COMPILED.matcher(password).matches();
    }

    public String getRequirementsMessage() {
        return "Password must be at least " + minLength()
                + " characters long and include uppercase, lowercase, a number, and a special character.";
    }
}