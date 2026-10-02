package com.jaytechwave.sacco.modules.core.utils;

public class PhoneUtils {

    /**
     * Normalizes a Kenyan phone number to the standard E.164 format (+254...).
     * This ensures hashes are deterministic and lookups succeed regardless of
     * user input format (e.g. "0711 223 344", "0711223344", "254711223344").
     *
     * @param raw The raw phone number string
     * @return The normalized phone number string, or null if input is empty/invalid
     */
    public static String normalizePhone(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }

        // Strip all non-numeric characters (removes spaces, hyphens, brackets, '+')
        String digits = raw.replaceAll("[^0-9]", "");

        if (digits.isEmpty()) {
            return null;
        }

        // Standardize to "+254..." format for Kenyan numbers
        if (digits.startsWith("07") || digits.startsWith("01")) {
            return "+254" + digits.substring(1);
        }
        if (digits.startsWith("7") || digits.startsWith("1")) {
            return "+254" + digits;
        }
        if (digits.startsWith("254") && digits.length() == 12) {
            return "+" + digits;
        }

        // Fallback: return with '+' prefix if it seems like a country code was provided,
        // otherwise just return the digits. E.164 usually has a + prefix.
        return "+" + digits;
    }
}
