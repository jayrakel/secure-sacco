package com.jaytechwave.sacco.modules.core.service;

import org.springframework.stereotype.Service;
import java.util.regex.Pattern;

@Service
public class PasswordValidator {

    // Regex for: 12+ chars, at least one upper, one lower, one digit, and one special char
    private static final String PASSWORD_PATTERN =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$";

    private static final Pattern pattern = Pattern.compile(PASSWORD_PATTERN);

    public boolean isValid(String password) {
        if (password == null) return false;
        return pattern.matcher(password).matches();
    }

    public String getRequirementsMessage() {
        return "Password must be at least 12 characters long and include uppercase, lowercase, a number, and a special character.";
    }
}