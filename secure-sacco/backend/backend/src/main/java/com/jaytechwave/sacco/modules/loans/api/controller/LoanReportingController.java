package com.jaytechwave.sacco.modules.loans.api.controller;

import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.ArrearsSummaryResponse;
import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.LoanSummaryResponse;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanReportingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/loans/reports")
@RequiredArgsConstructor
@Tag(name = "Loans", description = "Loan applications, approval workflow, disbursement")
public class LoanReportingController {

    private final LoanReportingService loanReportingService;

    @Operation(summary = "Member loan summary", description = "Returns a summary of a specific loan for the authenticated member.")
    @GetMapping("/{id}/summary/member")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<LoanSummaryResponse> getMemberLoanSummary(
            @PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(loanReportingService.getMemberLoanSummary(id, authentication.getName()));
    }

    @Operation(summary = "Staff loan summary", description = "Full loan summary for staff review. Requires LOANS_READ.")
    @GetMapping("/{id}/summary/staff")
    @PreAuthorize("hasAuthority('LOANS_READ')")
    public ResponseEntity<LoanSummaryResponse> getStaffLoanSummary(@PathVariable UUID id) {
        return ResponseEntity.ok(loanReportingService.getStaffLoanSummary(id));
    }

    @Operation(summary = "Arrears report", description = "Returns all loans in arrears. Requires LOANS_READ.")
    @GetMapping("/arrears")
    @PreAuthorize("hasAuthority('LOANS_READ')")
    public ResponseEntity<List<ArrearsSummaryResponse>> getArrearsReport() {
        return ResponseEntity.ok(loanReportingService.getArrearsReport());
    }
}