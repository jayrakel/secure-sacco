package com.jaytechwave.sacco.modules.core.util;

import java.time.ZoneId;

/**
 * Central timezone constants for Secure SACCO.
 *
 * <p>All {@code LocalDateTime.now()} and {@code LocalDate.now()} calls in the
 * system must pass {@link #NAIROBI} so that timestamps are captured in
 * Africa/Nairobi (EAT = UTC+3) rather than the JVM default (UTC).</p>
 *
 * <p>Usage:</p>
 * <pre>
 *   LocalDateTime.now(SaccoDateUtils.NAIROBI)
 *   LocalDate.now(SaccoDateUtils.NAIROBI)
 * </pre>
 */
public final class SaccoDateUtils {

    /** East Africa Time — Nairobi, Kenya (UTC+3, no DST). */
    public static final ZoneId NAIROBI = ZoneId.of("Africa/Nairobi");

    private SaccoDateUtils() { /* utility class – no instances */ }
}