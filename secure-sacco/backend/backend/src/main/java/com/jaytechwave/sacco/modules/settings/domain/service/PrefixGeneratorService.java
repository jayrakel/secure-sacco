package com.jaytechwave.sacco.modules.settings.domain.service;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PrefixGeneratorService {

    private static final List<String> STOP_WORDS = Arrays.asList(
            "THE", "AND", "OF", "IN", "A", "AN", "FOR"
    );

    /**
     * Generates a smart 3-letter prefix from a given SACCO name.
     */
    public String generate(String saccoName) {
        if (saccoName == null || saccoName.trim().isEmpty()) {
            return "SAC"; // Default fallback
        }

        // Clean string: uppercase, remove non-alphabetic (keep spaces)
        String cleanName = saccoName.toUpperCase().replaceAll("[^A-Z]", " ");

        // Split into words and filter out stop words
        List<String> words = Arrays.stream(cleanName.split("\\s+"))
                .filter(word -> !word.isEmpty() && !STOP_WORDS.contains(word))
                .collect(Collectors.toList());

        // If filtering removed everything, fall back to the cleaned original words
        if (words.isEmpty()) {
            words = Arrays.stream(cleanName.split("\\s+"))
                    .filter(w -> !w.isEmpty())
                    .collect(Collectors.toList());
        }

        // Still empty? (e.g. they typed only special characters)
        if (words.isEmpty()) {
            return "SAC";
        }

        StringBuilder prefix = new StringBuilder();

        // Strategy 1: Take the first letter of the first 3 words
        for (String word : words) {
            if (prefix.length() < 3) {
                prefix.append(word.charAt(0));
            }
        }

        // Strategy 2: If we still don't have 3 letters (e.g., name only has 1 or 2 words)
        // Pad with the next available letters from the FIRST word
        if (prefix.length() < 3 && !words.isEmpty()) {
            String firstWord = words.get(0);
            for (int i = 1; i < firstWord.length() && prefix.length() < 3; i++) {
                prefix.append(firstWord.charAt(i));
            }
        }

        // Strategy 3: If the entire name is insanely short (e.g., "IT"), pad with 'X'
        while (prefix.length() < 3) {
            prefix.append("X");
        }

        return prefix.toString();
    }
}