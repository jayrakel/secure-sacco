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
            log.info("🚀 Running startup seed: SYSTEM_ADMIN");

            initializeAdminUser();

            log.info("✅ Startup seed complete.");
        };
    }

    private void initializeAdminUser() {
        boolean adminExists = userService.existsByEmail(adminEmail);

        if (adminExists) {
            log.info("ℹ️ SYSTEM_ADMIN user already exists: {}", adminEmail);
            return;
        }

        String officialEmail = "admin@" + officialEmailDomain;

        log.info("👤 Creating bootstrap SYSTEM_ADMIN user...");

        userService.createBootstrapSystemAdmin(
                "System",
                "Administrator",
                adminEmail,
                officialEmail,
                adminPhone,
                adminPassword
        );

        log.info("✅ Bootstrap SYSTEM_ADMIN user created: {}", adminEmail);
    }
}