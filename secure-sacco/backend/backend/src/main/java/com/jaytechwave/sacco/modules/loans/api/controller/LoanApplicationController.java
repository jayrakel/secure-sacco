package com.jaytechwave.sacco.modules.loans.api.controller;

import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs;
import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.*;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanApplicationService;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanRepaymentService;
import com.jaytechwave.sacco.modules.core.api.PageSizeValidator;
import com.jaytechwave.sacco.modules.core.api.dto.PagedResponse;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/loans/applications")
@RequiredArgsConstructor
@Tag(name = "Loans", description = "Loan applications, approval workflow, disbursement")
public class LoanApplicationController {

    private final LoanApplicationService loanApplicationService;
    private final LoanRepaymentService loanRepaymentService;

    @Operation(summary = "Submit loan application", description = "Creates a new loan application for the authenticated member. Starts in DRAFT status.",
        responses = { @ApiResponse(responseCode = "200", description = "Application created"),
                      @ApiResponse(responseCode = "400", description = "Validation error"),
                      @ApiResponse(responseCode = "403", description = "Not an active member") })
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<LoanApplicationResponse> createApplication(
            @Valid @RequestBody CreateLoanApplicationRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.createApplication(request, authentication.getName()));
    }

    @PostMapping("/{id}/pay-fee")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<InitiateStkResponse> payApplicationFee(
            @PathVariable UUID id,
            @Valid @RequestBody PayLoanFeeRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.initiateFeePayment(id, request, authentication.getName()));
    }

    @PostMapping("/{id}/guarantors")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<GuarantorResponse> addGuarantor(
            @PathVariable UUID id,
            @Valid @RequestBody AddGuarantorRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.addGuarantor(id, request, authentication.getName()));
    }

    @DeleteMapping("/{id}/guarantors/{guarantorId}")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<Void> removeGuarantor(
            @PathVariable UUID id,
            @PathVariable UUID guarantorId,
            Authentication authentication) {
        loanApplicationService.removeGuarantor(id, guarantorId, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/guarantors")
    @PreAuthorize("isAuthenticated()") // Needed by member and staff later
    public ResponseEntity<List<GuarantorResponse>> getGuarantors(@PathVariable UUID id) {
        return ResponseEntity.ok(loanApplicationService.getGuarantors(id));
    }

    @Operation(summary = "Submit application for review", description = "Transitions application from DRAFT to PENDING_APPROVAL.")
    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<Void> submitApplication(
            @PathVariable UUID id,
            Authentication authentication) {
        loanApplicationService.submitApplication(id, authentication.getName());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Get my loan applications", description = "Returns all loan applications for the authenticated member.")
    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<List<LoanApplicationResponse>> getMyApplications(Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.getMyApplications(authentication.getName()));
    }

    @Operation(summary = "Get all loan applications", description = "Returns all applications. Requires loan officer or approver permission.")
    @GetMapping("/all")
    @PreAuthorize("hasAnyAuthority('ROLE_SYSTEM_ADMIN', 'ROLE_LOANS_OFFICER', 'ROLE_TREASURER')")
    public ResponseEntity<PagedResponse<LoanApplicationResponse>> getAllApplications(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageSizeValidator.validated(pageable);
        return ResponseEntity.ok(PagedResponse.from(
                loanApplicationService.getAllApplications(pageable)));
    }

    @Operation(summary = "Get applications queue by status", description = "Returns applications filtered by status (e.g. PENDING_APPROVAL, VERIFIED).")
    @GetMapping("/queue/{status}")
    @PreAuthorize("hasAnyAuthority('ROLE_SYSTEM_ADMIN', 'ROLE_LOANS_OFFICER', 'ROLE_TREASURER')")
    public ResponseEntity<PagedResponse<LoanApplicationResponse>> getApplicationsByStatus(
            @PathVariable LoanStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageSizeValidator.validated(pageable);
        return ResponseEntity.ok(PagedResponse.from(
                loanApplicationService.getApplicationsByStatus(status, pageable)));
    }

    @Operation(summary = "Verify application", description = "Loans Officer first-level review. Transitions to VERIFIED or REJECTED.")
    @PostMapping("/{id}/verify")
    @PreAuthorize("hasAuthority('LOANS_APPROVE')")
    public ResponseEntity<LoanApplicationResponse> verifyApplication(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewLoanRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.verifyApplication(id, request, authentication.getName()));
    }

    @Operation(summary = "Approve application", description = "Loans Committee final approval. Transitions to APPROVED.")
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('LOANS_COMMITTEE_APPROVE')")
    public ResponseEntity<LoanApplicationResponse> approveApplication(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewLoanRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.approveApplication(id, request, authentication.getName()));
    }

    @Operation(summary = "Reject application", description = "Reject an application at any review stage.")
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('LOANS_APPROVE') or hasAuthority('LOANS_COMMITTEE_APPROVE')")
    public ResponseEntity<LoanApplicationResponse> rejectApplication(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewLoanRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.rejectApplication(id, request, authentication.getName()));
    }

    @Operation(summary = "Disburse loan", description = "Mark an APPROVED loan as ACTIVE and trigger disbursement. Requires LOANS_DISBURSE.")
    @PostMapping("/{id}/disburse")
    @PreAuthorize("hasAuthority('LOANS_DISBURSE')")
    public ResponseEntity<LoanApplicationResponse> disburseApplication(
            @PathVariable UUID id,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.disburseApplication(id, authentication.getName()));
    }

    @Operation(summary = "Initiate loan repayment", description = "Triggers an M-Pesa STK push for a loan repayment instalment.")
    @PostMapping("/{id}/repay")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<InitiateStkResponse> initiateRepayment(
            @PathVariable UUID id,
            @Valid @RequestBody RepayLoanRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanRepaymentService.initiateRepayment(id, request, authentication.getName()));
    }

    @PostMapping("/refinance")
    @PreAuthorize("hasAuthority('LOAN_DISBURSE')")
    public ResponseEntity<LoanDTOs.LoanApplicationResponse> refinanceLoan(
            @RequestBody LoanDTOs.RefinanceRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(loanApplicationService.refinanceLoan(request, authentication.getName()));
    }
}
