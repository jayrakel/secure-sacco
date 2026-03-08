package com.jaytechwave.sacco.modules.core.config;

import com.jaytechwave.sacco.modules.core.security.SecurityHeadersFilter;
import com.jaytechwave.sacco.modules.core.security.CsrfCookieFilter;
import com.jaytechwave.sacco.modules.core.security.MustChangePasswordFilter;
import com.jaytechwave.sacco.modules.core.security.ApiRateLimitFilter;
import com.jaytechwave.sacco.modules.payments.infrastructure.filter.MpesaIpWhitelistFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("#{'${sacco.security.cors.allowed-origins}'.split(',')}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, SecurityHeadersFilter securityHeadersFilter, MustChangePasswordFilter mustChangePasswordFilter, MpesaIpWhitelistFilter mpesaIpWhitelistFilter, ApiRateLimitFilter apiRateLimitFilter) throws Exception {

            // --- 1. Custom Security Headers & Request Tracing ---
            http.addFilterBefore(securityHeadersFilter, org.springframework.security.web.session.SessionManagementFilter.class);

            // --- 2. Advanced HTTP Security Headers (CSP, HSTS, Clickjacking) ---
            http.headers(headers -> headers
                    .frameOptions(frame -> frame.deny())                          // Prevent Clickjacking
                    .contentTypeOptions(org.springframework.security.config.Customizer.withDefaults()) // MIME sniffing
                    .httpStrictTransportSecurity(hsts -> hsts                     // Enforce HTTPS
                            .includeSubDomains(true)
                            .maxAgeInSeconds(31536000))
                    .contentSecurityPolicy(csp -> csp                             // Prevent XSS
                            .policyDirectives("default-src 'self'; script-src 'self'; object-src 'none'"))
                    .referrerPolicy(ref -> ref                                    // Privacy
                            .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                    .permissionsPolicy(policy -> policy                           // Device access
                            .policy("geolocation=(), microphone=(), camera=()"))
            );

        // Define the standard CSRF request handler for SPAs
        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        // Set the name of the attribute the CsrfToken will be populated on
        requestHandler.setCsrfRequestAttributeName("_csrf");

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // --- NEW CSRF CONFIGURATION ---
                .csrf(csrf -> csrf
                        // withHttpOnlyFalse() ensures the frontend JS (Axios) can read the XSRF-TOKEN cookie
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(requestHandler)
                        .ignoringRequestMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/login/mfa",
                                "/api/v1/auth/forgot-password",
                                "/api/v1/auth/reset-password",
                                "/api/v1/auth/activation/**",
                                "/api/v1/payments/mpesa/**",
                                "/error"
                        )
                )
                .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class)
                .addFilterAfter(apiRateLimitFilter, CsrfCookieFilter.class)
                .addFilterAfter(mustChangePasswordFilter, CsrfCookieFilter.class)
                .addFilterBefore(mpesaIpWhitelistFilter, UsernamePasswordAuthenticationFilter.class)
                .sessionManagement(session -> session
                        .sessionFixation().migrateSession()
                        .maximumSessions(5)
                )
                .authorizeHttpRequests(auth -> auth
                        // --- Public auth endpoints ---
                        .requestMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/login/mfa",
                                "/api/v1/auth/csrf",
                                "/api/v1/auth/forgot-password",
                                "/api/v1/auth/activation/**",
                                "/api/v1/auth/reset-password",
                                "/error"
                        ).permitAll()

                        // --- M-Pesa callbacks (unauthenticated — Safaricom calls these) ---
                        .requestMatchers("/api/v1/payments/mpesa/**").permitAll()

                        // --- Actuator: health is public (load balancer probes) ---
                        .requestMatchers("/actuator/health").permitAll()

                        // --- Actuator: metrics and prometheus require SYSTEM_ADMIN ---
                        .requestMatchers("/actuator/**").hasAuthority("ROLE_SYSTEM_ADMIN")

                        // --- Everything else requires authentication ---
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"You must log in to access this resource.\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.getWriter().write("{\"error\": \"Forbidden\", \"message\": \"You do not have permission to perform this action.\"}");
                        })
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Allow the React dev server
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Cache-Control", "Content-Type", "X-XSRF-TOKEN"));
        // Explicitly allow credentials (cookies)
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}