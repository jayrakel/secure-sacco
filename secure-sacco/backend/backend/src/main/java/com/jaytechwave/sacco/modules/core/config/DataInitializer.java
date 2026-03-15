package com.jaytechwave.sacco.modules.core.config;

import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.users.domain.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Seeds the one-and-only SYSTEM_ADMIN user on first startup.
 *
 * <h3>Duplicate-prevention — two independent layers</h3>
 * <ol>
 *   <li><b>App layer:</b> checks whether ANY user already holds SYSTEM_ADMIN role
 *       (role-based, immune to email/env-var changes).</li>
 *   <li><b>DB layer:</b> {@code V42__enforce_single_system_admin.sql} installs a
 *       BEFORE INSERT trigger that rejects a second SYSTEM_ADMIN assignment even
 *       via raw SQL.</li>
 * </ol>
 *
 * <h3>Required env vars — no defaults, app won't start without them</h3>
 * <ul>
 *   <li>{@code APP_DEFAULT_ADMIN_EMAIL}</li>
 *   <li>{@code APP_DEFAULT_ADMIN_PASSWORD}</li>
 *   <li>{@code APP_DEFAULT_ADMIN_PHONE}</li>
 * </ul>
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private static final String KNOWN_DEFAULT_PASSWORD = "Admin@12345678";

    private final UserService    userService;
    private final UserRepository userRepository;

    @Value("${app.default-admin.email}")
    private String adminEmail;

    @Value("${app.default-admin.password}")
    private String adminPassword;

    @Value("${app.default-admin.phone}")
    private String adminPhone;

    @Value("${app.official-email-domain}")
    private String officialEmailDomain;

    @Bean
    @Transactional
    @ConditionalOnProperty(name = "app.data-initializer.enabled", havingValue = "true", matchIfMissing = true)
    public CommandLineRunner seedSystemAdmin() {
        return args -> {
            log.info("🚀 Running startup seed: SYSTEM_ADMIN");
            validateConfig();
            warnIfDefaultCredentials();
            initializeAdminUser();
            log.info("✅ Startup seed complete.");
        };
    }

    // ── Fail-fast guard ───────────────────────────────────────────────────────

    private void validateConfig() {
        if (!StringUtils.hasText(adminEmail)) {
            throw new IllegalStateException(
                    "FATAL: APP_DEFAULT_ADMIN_EMAIL is not set. Add it to your .env and restart.");
        }
        if (!StringUtils.hasText(adminPassword)) {
            throw new IllegalStateException(
                    "FATAL: APP_DEFAULT_ADMIN_PASSWORD is not set. Add it to your .env and restart.");
        }
        if (!StringUtils.hasText(adminPhone)) {
            throw new IllegalStateException(
                    "FATAL: APP_DEFAULT_ADMIN_PHONE is not set. Add it to your .env and restart.");
        }
    }

    private void warnIfDefaultCredentials() {
        if (KNOWN_DEFAULT_PASSWORD.equals(adminPassword)) {
            log.warn("==========================================================================");
            log.warn("  SECURITY WARNING: APP_DEFAULT_ADMIN_PASSWORD is the well-known default.");
            log.warn("  Override it via APP_DEFAULT_ADMIN_PASSWORD before going to production.  ");
            log.warn("==========================================================================");
        }
    }

    // ── Seed ─────────────────────────────────────────────────────────────────

    private void initializeAdminUser() {
        // ✅ ROLE-based check, not email-based.
        // Immune to env-var changes; the DB trigger in V42 is the second guard.
        if (userRepository.existsByRolesName("SYSTEM_ADMIN")) {
            userRepository.findFirstByRolesName("SYSTEM_ADMIN")
                    .ifPresent(u -> log.info("ℹ️  SYSTEM_ADMIN already exists: {}", u.getEmail()));
            return;
        }

        String normalizedEmail = adminEmail.trim().toLowerCase();
        String officialEmail   = "admin@" + officialEmailDomain;

        log.info("👤 Creating bootstrap SYSTEM_ADMIN: {}", normalizedEmail);

        userService.createBootstrapSystemAdmin(
                "System",
                "Administrator",
                normalizedEmail,
                officialEmail,
                adminPhone.trim(),
                adminPassword,
                true   // mustChangePassword = true → forced on first login
        );

        log.info("✅ Bootstrap SYSTEM_ADMIN created. First login will require a password change.");
    }
}