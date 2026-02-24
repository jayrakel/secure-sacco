package com.jaytechwave.sacco.modules.core.service;

import org.springframework.stereotype.Service;
import java.util.regex.Pattern;

@Service
public class PasswordValidator {

    // Updated Regex: Added _, ., -, and # to the allowed special characters list
    private static final String PASSWORD_PATTERN =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_\\-.#])[A-Za-z\\d@$!%*?&_\\-.#]{12,}$";

    private static final Pattern pattern = Pattern.compile(PASSWORD_PATTERN);

    public boolean isValid(String password) {
        if (password == null) return false;
        return pattern.matcher(password).matches();
    }

    public String getRequirementsMessage() {
        return "Password must be at least 12 characters long and include uppercase, lowercase, a number, and a special character.";
    }
}