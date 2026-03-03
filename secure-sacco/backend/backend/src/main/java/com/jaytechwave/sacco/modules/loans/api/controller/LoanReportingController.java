package com.jaytechwave.sacco.modules.loans.api.controller;

import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.ArrearsSummaryResponse;
import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.LoanSummaryResponse;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanReportingService;
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
public class LoanReportingController {

    private final LoanReportingService loanReportingService;

    @GetMapping("/{id}/summary/member")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<LoanSummaryResponse> getMemberLoanSummary(
            @PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(loanReportingService.getMemberLoanSummary(id, authentication.getName()));
    }

    @GetMapping("/{id}/summary/staff")
    @PreAuthorize("hasAuthority('LOANS_APPROVE') or hasAuthority('LOANS_COMMITTEE_APPROVE') or hasAuthority('LOANS_DISBURSE')")
    public ResponseEntity<LoanSummaryResponse> getStaffLoanSummary(@PathVariable UUID id) {
        return ResponseEntity.ok(loanReportingService.getStaffLoanSummary(id));
    }

    @GetMapping("/arrears")
    @PreAuthorize("hasAuthority('LOANS_APPROVE') or hasAuthority('LOANS_COMMITTEE_APPROVE') or hasAuthority('LOANS_DISBURSE')")
    public ResponseEntity<List<ArrearsSummaryResponse>> getSystemArrearsReport() {
        return ResponseEntity.ok(loanReportingService.getStaffArrearsReport());
    }
}