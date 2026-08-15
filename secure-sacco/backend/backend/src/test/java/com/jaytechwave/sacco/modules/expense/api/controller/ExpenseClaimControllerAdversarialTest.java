package com.jaytechwave.sacco.modules.expense.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.jaytechwave.sacco.modules.expense.api.dto.ExpenseClaimDTOs.*;
import com.jaytechwave.sacco.modules.expense.domain.service.ExpenseClaimService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Adversarial Controller Validation Testing")
public class ExpenseClaimControllerAdversarialTest {

    @Mock
    private ExpenseClaimService expenseClaimService;

    @InjectMocks
    private ExpenseClaimController controller;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("Validation: Zero claim amount rejected by @DecimalMin")
    void testZeroClaimAmount_rejected() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "member@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("ROLE_MEMBER")));
        MemberSubmitExpenseClaimRequest request = new MemberSubmitExpenseClaimRequest(
                BigDecimal.ZERO, "Invalid zero amount", "RCP-000", null
        );

        mockMvc.perform(post("/api/v1/expense-claims/my")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Validation: Negative claim amount rejected by @DecimalMin")
    void testNegativeClaimAmount_rejected() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "member@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("ROLE_MEMBER")));
        MemberSubmitExpenseClaimRequest request = new MemberSubmitExpenseClaimRequest(
                new BigDecimal("-500.00"), "Negative amount", "RCP-NEG", null
        );

        mockMvc.perform(post("/api/v1/expense-claims/my")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
