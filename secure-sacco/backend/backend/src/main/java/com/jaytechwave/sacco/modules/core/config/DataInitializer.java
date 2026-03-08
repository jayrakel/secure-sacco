package com.jaytechwave.sacco.modules.core.config;

import com.jaytechwave.sacco.modules.users.domain.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private static final String KNOWN_DEFAULT_PASSWORD = "Admin@12345678";

    private final UserService userService;

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
    public CommandLineRunner seedSystemAdmin() {
        return args -> {
            log.info("Running startup seed: SYSTEM_ADMIN");
            warnIfDefaultCredentials();
            initializeAdminUser();
            log.info("Startup seed complete.");
        };
    }

    /**
     * Emits a loud WARN at startup if the admin password matches the well-known
     * default. This catches deployments that forgot to override the env variable.
     */
    private void warnIfDefaultCredentials() {
        if (KNOWN_DEFAULT_PASSWORD.equals(adminPassword)) {
            log.warn("======================================================================");
            log.warn("  SECURITY WARNING: APP_DEFAULT_ADMIN_PASSWORD is set to the default  ");
            log.warn("  value. Override it immediately via the APP_DEFAULT_ADMIN_PASSWORD    ");
            log.warn("  environment variable before going to production.                     ");
            log.warn("======================================================================");
        }
    }

    private void initializeAdminUser() {
        boolean adminExists = userService.existsByEmail(adminEmail);

        if (adminExists) {
            log.info("SYSTEM_ADMIN user already exists: {}", adminEmail);
            return;
        }

        String officialEmail = "admin@" + officialEmailDomain;

        log.info("Creating bootstrap SYSTEM_ADMIN user: {}", adminEmail);

        userService.createBootstrapSystemAdmin(
                "System",
                "Administrator",
                adminEmail,
                officialEmail,
                adminPhone,
                adminPassword,
                true  // mustChangePassword = true — force password change on first login
        );

        log.info("Bootstrap SYSTEM_ADMIN created. The user MUST change their password on first login.");
    }
}