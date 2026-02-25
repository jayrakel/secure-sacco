package com.jaytechwave.sacco.modules.settings.domain.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class PrefixGeneratorServiceTest {

    private final PrefixGeneratorService generator = new PrefixGeneratorService();

    @Test
    void testStandardThreeWordName() {
        assertEquals("BVL", generator.generate("Betterlink Ventures Limited"));
    }

    @Test
    void testStopWordsAreIgnored() {
        assertEquals("TSE", generator.generate("The Tech Sacco")); // Fixed typo here!
        assertEquals("MKS", generator.generate("Ministry of Kenya Sacco"));
    }

    @Test
    void testTwoWordNamePadsWithSecondLetterOfFirstWord() {
        // "Acme Sacco" -> First letters: A, S. Needs 1 more -> takes 'C' from Acme -> ASC
        assertEquals("ASC", generator.generate("Acme Sacco"));
    }

    @Test
    void testSingleWordName() {
        assertEquals("DEV", generator.generate("Developers"));
        assertEquals("SAF", generator.generate("Safaricom"));
    }

    @Test
    void testExtremelyShortName() {
        assertEquals("ITX", generator.generate("IT"));
    }

    @Test
    void testSpecialCharactersAreIgnored() {
        assertEquals("BVL", generator.generate("Betterlink-Ventures, Limited!"));
    }

    @Test
    void testEmptyOrNull() {
        assertEquals("SAC", generator.generate(""));
        assertEquals("SAC", generator.generate(null));
        assertEquals("SAC", generator.generate("   "));
        assertEquals("SAC", generator.generate(" !@# "));
    }
}