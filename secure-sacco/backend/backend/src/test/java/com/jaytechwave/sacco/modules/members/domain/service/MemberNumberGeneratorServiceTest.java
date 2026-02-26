package com.jaytechwave.sacco.modules.members.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.MemberSequence;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberSequenceRepository;
import com.jaytechwave.sacco.modules.settings.domain.entity.SaccoSettings;
import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Year;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MemberNumberGeneratorServiceTest {

    @Mock
    private MemberSequenceRepository sequenceRepository;

    @Mock
    private SaccoSettingsService settingsService;

    @InjectMocks
    private MemberNumberGeneratorService generatorService;

    private SaccoSettings mockSettings;
    private MemberSequence mockSequence;

    @BeforeEach
    void setUp() {
        mockSettings = SaccoSettings.builder()
                .memberNumberPrefix("BVL")
                .memberNumberPadLength(7)
                .build();

        mockSequence = new MemberSequence();
        mockSequence.setNextValue(1L);
    }

    @Test
    void testGenerateFirstMemberNumber() {
        // Arrange
        when(settingsService.isInitialized()).thenReturn(true);
        when(settingsService.getSettings()).thenReturn(mockSettings);
        when(sequenceRepository.findSequenceWithLock()).thenReturn(Optional.of(mockSequence));

        // Act
        String memberNumber = generatorService.generateNextMemberNumber();

        // Assert
        int currentYear = Year.now().getValue();
        String expectedFormat = String.format("BVL-%d-0000001", currentYear);

        assertEquals(expectedFormat, memberNumber);
        assertEquals(2L, mockSequence.getNextValue(), "Sequence should be incremented");
        verify(sequenceRepository).save(mockSequence);
    }

    @Test
    void testGenerateWithCustomPadLengthAndHighSequence() {
        // Arrange
        mockSettings.setMemberNumberPadLength(4); // Shorter pad length
        mockSequence.setNextValue(42L); // Advanced sequence

        when(settingsService.isInitialized()).thenReturn(true);
        when(settingsService.getSettings()).thenReturn(mockSettings);
        when(sequenceRepository.findSequenceWithLock()).thenReturn(Optional.of(mockSequence));

        // Act
        String memberNumber = generatorService.generateNextMemberNumber();

        // Assert
        int currentYear = Year.now().getValue();
        String expectedFormat = String.format("BVL-%d-0042", currentYear);

        assertEquals(expectedFormat, memberNumber);
        assertEquals(43L, mockSequence.getNextValue());
    }

    @Test
    void testThrowsExceptionIfSettingsNotInitialized() {
        // Arrange
        when(settingsService.isInitialized()).thenReturn(false);

        // Act & Assert
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> generatorService.generateNextMemberNumber());

        assertEquals("SACCO settings must be initialized before generating member numbers.", exception.getMessage());
        verify(sequenceRepository, never()).findSequenceWithLock(); // Should not even try to lock DB
    }

    @Test
    void testThrowsExceptionIfSequenceNotFound() {
        // Arrange
        when(settingsService.isInitialized()).thenReturn(true);
        when(settingsService.getSettings()).thenReturn(mockSettings);
        when(sequenceRepository.findSequenceWithLock()).thenReturn(Optional.empty());

        // Act & Assert
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> generatorService.generateNextMemberNumber());

        assertEquals("Member sequence table is not seeded in the database.", exception.getMessage());
    }
}