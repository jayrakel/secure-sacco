package com.jaytechwave.sacco.modules.core.notifications.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaytechwave.sacco.modules.core.notifications.SystemAlertService;
import com.jaytechwave.sacco.modules.core.notifications.api.dto.SystemAlertDTOs.SystemAlertRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SystemAlertControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private SystemAlertService systemAlertService;

    @InjectMocks
    private SystemAlertController systemAlertController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(systemAlertController).build();
        ReflectionTestUtils.setField(systemAlertController, "configuredApiKey", "test-secret-api-key");
    }

    @Test
    void dispatchAlert_WithValidApiKeyAndCriticalSeverity_ShouldSendSms() throws Exception {
        SystemAlertRequest request = new SystemAlertRequest();
        request.setSource("GitHub Actions");
        request.setService("Dependency Scanner");
        request.setSeverity("CRITICAL");
        request.setMessage("OWASP scan failed.");

        mockMvc.perform(post("/api/v1/system-alerts/dispatch")
                        .header("X-System-Alert-Api-Key", "test-secret-api-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        verify(systemAlertService, times(1)).dispatchAlert(any(SystemAlertRequest.class));
    }

    @Test
    void dispatchAlert_WithInvalidApiKey_ShouldReturnUnauthorized() throws Exception {
        SystemAlertRequest request = new SystemAlertRequest();
        request.setSource("GitHub Actions");
        request.setService("Dependency Scanner");
        request.setSeverity("CRITICAL");
        request.setMessage("OWASP scan failed.");

        mockMvc.perform(post("/api/v1/system-alerts/dispatch")
                        .header("X-System-Alert-Api-Key", "wrong-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verify(systemAlertService, times(0)).dispatchAlert(any(SystemAlertRequest.class));
    }

    @Test
    void dispatchAlert_WithUnconfiguredApiKey_ShouldReturnForbidden() throws Exception {
        ReflectionTestUtils.setField(systemAlertController, "configuredApiKey", "");

        SystemAlertRequest request = new SystemAlertRequest();
        request.setSource("GitHub Actions");
        request.setService("Dependency Scanner");
        request.setSeverity("CRITICAL");
        request.setMessage("OWASP scan failed.");

        mockMvc.perform(post("/api/v1/system-alerts/dispatch")
                        .header("X-System-Alert-Api-Key", "test-secret-api-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(systemAlertService, times(0)).dispatchAlert(any(SystemAlertRequest.class));
    }
}
