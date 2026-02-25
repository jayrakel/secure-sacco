package com.jaytechwave.sacco.modules.settings.api.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaytechwave.sacco.modules.settings.domain.service.FeatureFlagService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@RequiredArgsConstructor
public class FeatureFlagInterceptor implements HandlerInterceptor {

    private final String moduleName;
    private final FeatureFlagService featureFlagService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Always allow CORS preflight requests through
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        if (featureFlagService.isModuleEnabled(moduleName)) {
            return true;
        }

        // If disabled, write a 403 Forbidden response
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, String> error = Map.of(
                "error", "Forbidden",
                "message", "The '" + moduleName + "' module is currently disabled by the system administrator."
        );

        response.getWriter().write(objectMapper.writeValueAsString(error));
        return false;
    }
}