package com.jaytechwave.sacco.modules.core.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI 3.0 configuration for the Secure SACCO Management API.
 *
 * <p>Swagger UI is available at {@code /swagger-ui/index.html} (restricted to
 * SYSTEM_ADMIN in production via SecurityConfig).</p>
 */
@Configuration
public class OpenApiConfig {

    @Value("${spring.application.name:Secure SACCO}")
    private String appName;

    @Bean
    public OpenAPI saccoOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title(appName + " Management API")
                        .description("""
                                REST API for the Secure SACCO Management System.
                                
                                **Authentication:** Session-cookie based. Obtain a session via \
                                `POST /api/v1/auth/login`. All endpoints (except auth and M-Pesa \
                                callbacks) require an authenticated session.
                                
                                **CSRF:** The frontend must include the `X-XSRF-TOKEN` header \
                                (read from the `XSRF-TOKEN` cookie) on all mutating requests.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("SACCO Development Team")
                                .email("dev@jaytechwave.org"))
                        .license(new License().name("Proprietary")))

                .servers(List.of(
                        new Server().url("/").description("Current server"),
                        new Server().url("https://api.securesacco.com").description("Production")
                ))

                // Define the session-cookie security scheme
                .components(new Components()
                        .addSecuritySchemes("cookieAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE)
                                .name("SESSION")
                                .description("Session cookie obtained via POST /api/v1/auth/login")))

                // Apply globally — individual endpoints can override with @SecurityRequirement
                .addSecurityItem(new SecurityRequirement().addList("cookieAuth"));
    }
}