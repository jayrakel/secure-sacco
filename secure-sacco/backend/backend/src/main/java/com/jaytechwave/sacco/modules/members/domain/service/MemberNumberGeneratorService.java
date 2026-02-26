package com.jaytechwave.sacco.modules.members.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.MemberSequence;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberSequenceRepository;
import com.jaytechwave.sacco.modules.settings.domain.entity.SaccoSettings;
import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;

@Service
@RequiredArgsConstructor
public class MemberNumberGeneratorService {

    private final MemberSequenceRepository sequenceRepository;
    private final SaccoSettingsService settingsService;

    /**
     * Generates a thread-safe, strictly sequential member number based on global SACCO settings.
     * Uses a Pessimistic Write Lock on the database to prevent duplicate generation.
     */
    @Transactional
    public String generateNextMemberNumber() {
        // 1. Fetch Global Settings
        if (!settingsService.isInitialized()) {
            throw new IllegalStateException("SACCO settings must be initialized before generating member numbers.");
        }

        SaccoSettings settings = settingsService.getSettings();
        String prefix = settings.getMemberNumberPrefix();
        int padLength = settings.getMemberNumberPadLength();

        // 2. Fetch and Lock Sequence
        MemberSequence sequence = sequenceRepository.findSequenceWithLock()
                .orElseThrow(() -> new IllegalStateException("Member sequence table is not seeded in the database."));

        // 3. Extract Values
        long currentValue = sequence.getNextValue();
        int currentYear = Year.now().getValue();

        // 4. Increment and Save (Lock is released when transaction commits)
        sequence.setNextValue(currentValue + 1);
        sequenceRepository.save(sequence);

        // 5. Format and Return
        // Format string creates something like "%s-%d-%07d" which pads the sequence with zeros
        String formatString = "%s-%d-%0" + padLength + "d";

        return String.format(formatString, prefix, currentYear, currentValue);
    }
}