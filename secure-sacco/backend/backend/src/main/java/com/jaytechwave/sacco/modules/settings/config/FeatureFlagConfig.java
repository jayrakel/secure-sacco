package com.jaytechwave.sacco.modules.settings.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaytechwave.sacco.modules.settings.api.interceptor.FeatureFlagInterceptor;
import com.jaytechwave.sacco.modules.settings.domain.service.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class FeatureFlagConfig implements WebMvcConfigurer {

    private final FeatureFlagService featureFlagService;
    private final ObjectMapper objectMapper;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {

        // Block access to /api/v1/members/** if 'members' is false
        registry.addInterceptor(new FeatureFlagInterceptor("members", featureFlagService, objectMapper))
                .addPathPatterns("/api/v1/members/**");

        // Block access to /api/v1/loans/** if 'loans' is false
        registry.addInterceptor(new FeatureFlagInterceptor("loans", featureFlagService, objectMapper))
                .addPathPatterns("/api/v1/loans/**");

        // Block access to /api/v1/savings/** if 'savings' is false
        registry.addInterceptor(new FeatureFlagInterceptor("savings", featureFlagService, objectMapper))
                .addPathPatterns("/api/v1/savings/**");

        // Block access to /api/v1/reports/** if 'reports' is false
        registry.addInterceptor(new FeatureFlagInterceptor("reports", featureFlagService, objectMapper))
                .addPathPatterns("/api/v1/reports/**");
    }
}