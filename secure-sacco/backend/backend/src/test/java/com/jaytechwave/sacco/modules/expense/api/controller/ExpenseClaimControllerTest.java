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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ExpenseClaimController")
class ExpenseClaimControllerTest {

    @Mock
    private ExpenseClaimService expenseClaimService;

    @InjectMocks
    private ExpenseClaimController controller;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private final UUID claimId = UUID.randomUUID();
    private final UUID memberId = UUID.randomUUID();
    private final UUID reviewerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    private ExpenseClaimResponse createSampleResponse(String status) {
        return new ExpenseClaimResponse(
                claimId,
                memberId,
                "MBR-001",
                "Jane Doe",
                new BigDecimal("1500.00"),
                "Office Supplies",
                "RCP-1234",
                status,
                null,
                reviewerId,
                ZonedDateTime.now(),
                "EXP-" + claimId,
                ZonedDateTime.now(),
                List.of()
        );
    }

    // ─── Member endpoints ─────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/v1/expense-claims/my: returns member claims list")
    void getMyClaims_success() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "member@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("ROLE_MEMBER")));
        when(expenseClaimService.getMyClaims("member@sacco.co.ke"))
                .thenReturn(List.of(createSampleResponse("PENDING")));

        mockMvc.perform(get("/api/v1/expense-claims/my")
                        .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(claimId.toString()))
                .andExpect(jsonPath("$[0].amount").value(1500.00))
                .andExpect(jsonPath("$[0].status").value("PENDING"));

        verify(expenseClaimService).getMyClaims("member@sacco.co.ke");
    }

    @Test
    @DisplayName("POST /api/v1/expense-claims/my: member submits own claim")
    void submitMyClaim_success() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "member@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("ROLE_MEMBER")));
        MemberSubmitExpenseClaimRequest request = new MemberSubmitExpenseClaimRequest(
                new BigDecimal("1500.00"), "Office Supplies", "RCP-1234", List.of()
        );

        when(expenseClaimService.submitMyClaim(any(), eq("member@sacco.co.ke")))
                .thenReturn(createSampleResponse("PENDING"));

        mockMvc.perform(post("/api/v1/expense-claims/my")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(claimId.toString()))
                .andExpect(jsonPath("$.amount").value(1500.00))
                .andExpect(jsonPath("$.status").value("PENDING"));

        verify(expenseClaimService).submitMyClaim(any(), eq("member@sacco.co.ke"));
    }

    @Test
    @DisplayName("POST /api/v1/expense-claims/my: validation failure for amount < 1")
    void submitMyClaim_validationError_amountLessThanOne() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "member@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("ROLE_MEMBER")));
        MemberSubmitExpenseClaimRequest request = new MemberSubmitExpenseClaimRequest(
                new BigDecimal("0.50"), "Stationery", "RCP-001", null
        );

        mockMvc.perform(post("/api/v1/expense-claims/my")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(expenseClaimService, never()).submitMyClaim(any(), anyString());
    }

    @Test
    @DisplayName("POST /api/v1/expense-claims/my: validation failure for blank description")
    void submitMyClaim_validationError_blankDescription() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "member@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("ROLE_MEMBER")));
        MemberSubmitExpenseClaimRequest request = new MemberSubmitExpenseClaimRequest(
                new BigDecimal("500.00"), "  ", "RCP-001", null
        );

        mockMvc.perform(post("/api/v1/expense-claims/my")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(expenseClaimService, never()).submitMyClaim(any(), anyString());
    }

    // ─── Staff endpoints ──────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/v1/expense-claims: staff submits claim on behalf of member")
    void submitClaim_staff_success() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "treasurer@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("EXPENSE_CLAIMS_APPROVE")));
        SubmitExpenseClaimRequest request = new SubmitExpenseClaimRequest(
                memberId, new BigDecimal("2000.00"), "Fuel for field visit", "RCP-5678", null
        );

        when(expenseClaimService.submitClaim(any(), eq("treasurer@sacco.co.ke")))
                .thenReturn(createSampleResponse("PENDING"));

        mockMvc.perform(post("/api/v1/expense-claims")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(claimId.toString()));

        verify(expenseClaimService).submitClaim(any(), eq("treasurer@sacco.co.ke"));
    }

    @Test
    @DisplayName("POST /api/v1/expense-claims: validation failure for missing memberId")
    void submitClaim_validationError_missingMemberId() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "treasurer@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("EXPENSE_CLAIMS_APPROVE")));
        SubmitExpenseClaimRequest request = new SubmitExpenseClaimRequest(
                null, new BigDecimal("2000.00"), "Fuel", "RCP-5678", null
        );

        mockMvc.perform(post("/api/v1/expense-claims")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(expenseClaimService, never()).submitClaim(any(), anyString());
    }

    @Test
    @DisplayName("GET /api/v1/expense-claims/staff: returns all claims")
    void getAllClaims_staff_success() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "treasurer@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("EXPENSE_CLAIMS_READ")));
        when(expenseClaimService.getAllClaims())
                .thenReturn(List.of(createSampleResponse("PENDING"), createSampleResponse("APPROVED")));

        mockMvc.perform(get("/api/v1/expense-claims/staff")
                        .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));

        verify(expenseClaimService).getAllClaims();
    }

    @Test
    @DisplayName("POST /api/v1/expense-claims/{id}/review: approve claim")
    void reviewClaim_approve_success() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "treasurer@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("EXPENSE_CLAIMS_APPROVE")));
        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(true, null, null);

        when(expenseClaimService.reviewClaim(eq(claimId), any(), eq("treasurer@sacco.co.ke"), any()))
                .thenReturn(createSampleResponse("APPROVED"));

        mockMvc.perform(post("/api/v1/expense-claims/{id}/review", claimId)
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.journalReference").value("EXP-" + claimId));

        verify(expenseClaimService).reviewClaim(eq(claimId), any(), eq("treasurer@sacco.co.ke"), any());
    }

    @Test
    @DisplayName("POST /api/v1/expense-claims/{id}/review: reject claim")
    void reviewClaim_reject_success() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "treasurer@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("EXPENSE_CLAIMS_APPROVE")));
        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(false, "Invalid receipt", null);

        ExpenseClaimResponse rejectedResponse = new ExpenseClaimResponse(
                claimId, memberId, "MBR-001", "Jane Doe", new BigDecimal("1500.00"),
                "Office Supplies", "RCP-1234", "REJECTED", "Invalid receipt",
                reviewerId, ZonedDateTime.now(), null, ZonedDateTime.now(), List.of()
        );

        when(expenseClaimService.reviewClaim(eq(claimId), any(), eq("treasurer@sacco.co.ke"), any()))
                .thenReturn(rejectedResponse);

        mockMvc.perform(post("/api/v1/expense-claims/{id}/review", claimId)
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Invalid receipt"));

        verify(expenseClaimService).reviewClaim(eq(claimId), any(), eq("treasurer@sacco.co.ke"), any());
    }

    @Test
    @DisplayName("POST /api/v1/expense-claims/{id}/review: validation failure for null approved flag")
    void reviewClaim_validationError_nullApproved() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(
                "treasurer@sacco.co.ke", null, List.of(new SimpleGrantedAuthority("EXPENSE_CLAIMS_APPROVE")));
        ReviewExpenseClaimRequest request = new ReviewExpenseClaimRequest(null, null, null);

        mockMvc.perform(post("/api/v1/expense-claims/{id}/review", claimId)
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(expenseClaimService, never()).reviewClaim(any(), any(), any(), any());
    }
}
