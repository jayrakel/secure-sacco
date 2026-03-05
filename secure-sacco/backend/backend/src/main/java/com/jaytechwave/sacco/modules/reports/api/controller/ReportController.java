package com.jaytechwave.sacco.modules.reports.api.controller;

import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.FinancialOverviewDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementItemDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.MemberMiniSummaryDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.LoanArrearsDTO;
import com.jaytechwave.sacco.modules.reports.domain.service.ReportService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final UserRepository userRepository;

    @GetMapping("/financial-overview")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<List<FinancialOverviewDTO>> getFinancialOverview() {
        return ResponseEntity.ok(reportService.getMemberFinancialOverview());
    }

    // --- NEW: MINI SUMMARY WIDGET ENDPOINT ---
    @GetMapping("/me/summary")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<MemberMiniSummaryDTO> getMySummary() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("User session not found"));

        if (user.getMember() == null) {
            return ResponseEntity.ok(new MemberMiniSummaryDTO());
        }

        return ResponseEntity.ok(reportService.getMySummary(user.getMember().getId()));
    }

    @GetMapping("/members/{memberId}/statement")
    public ResponseEntity<List<StatementItemDTO>> getMemberStatement(
            @PathVariable UUID memberId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean hasReportsRead = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("REPORTS_READ"));

        // RBAC Enforcement: Staff can read any, Member can only read their own!
        if (!hasReportsRead) {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new AccessDeniedException("User session not found"));
            if (user.getMember() == null || !user.getMember().getId().equals(memberId)) {
                throw new AccessDeniedException("Security Violation: You do not have permission to view another member's statement.");
            }
        }

        return ResponseEntity.ok(reportService.getMemberStatement(memberId, from, to));
    }

    // --- NEW: LOAN ARREARS AGING REPORT ---
    @GetMapping("/loans/arrears")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<List<LoanArrearsDTO>> getLoanArrearsReport(
            @RequestParam(required = false) String bucket) {
        return ResponseEntity.ok(reportService.getLoanArrearsReport(bucket));
    }
}