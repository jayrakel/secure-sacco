package com.jaytechwave.sacco.modules.reports.api.controller;

import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.FinancialOverviewDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementItemDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.MemberMiniSummaryDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.LoanArrearsDTO;
import com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.PaymentLineDTO;
import com.jaytechwave.sacco.modules.reports.domain.service.ReportService;
import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.PaymentRouteLookupResponse;
import com.jaytechwave.sacco.modules.paymentproducts.domain.service.PaymentLookupService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Reports", description = "Financial reports, member statements, arrears and collection summaries")
public class ReportController {

    private final ReportService reportService;
    private final UserRepository userRepository;
    private final PaymentLookupService paymentLookupService;

    @Operation(summary = "Financial overview", description = "Returns financial summary for all members. Requires REPORTS_READ.")
    @GetMapping("/financial-overview")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<List<FinancialOverviewDTO>> getFinancialOverview() {
        return ResponseEntity.ok(reportService.getMemberFinancialOverview());
    }

    // --- NEW: MINI SUMMARY WIDGET ENDPOINT ---
    @Operation(summary = "My financial summary", description = "Returns a mini summary widget for the authenticated member.")
    @GetMapping("/me/summary")
    @PreAuthorize("hasAuthority('MEMBER_LOANS_VIEW')")
    public ResponseEntity<MemberMiniSummaryDTO> getMySummary() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("User session not found"));

        if (user.getMember() == null) {
            return ResponseEntity.ok(new MemberMiniSummaryDTO());
        }

        return ResponseEntity.ok(reportService.getMySummary(user.getMember().getId()));
    }

    @Operation(summary = "Member transaction statement", description = "Returns a member's statement. Staff (REPORTS_READ) can view any member; members can only view their own.")
    @GetMapping("/members/{memberId}/statement")
    public ResponseEntity<com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.StatementResponseDTO> getMemberStatement(
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

        return ResponseEntity.ok(reportService.getMemberStatementWithSummary(memberId, from, to));
    }

    // --- NEW: LOAN ARREARS AGING REPORT ---
    @Operation(summary = "Loan arrears aging report", description = "Returns loans in arrears grouped by aging bucket. Requires REPORTS_READ.")
    @GetMapping("/loans/arrears")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<List<LoanArrearsDTO>> getLoanArrearsReport(
            @RequestParam(required = false) String bucket) {
        return ResponseEntity.ok(reportService.getLoanArrearsReport(bucket));
    }

    @Operation(summary = "Daily collections summary", description = "Returns total collections for a given date. Requires REPORTS_READ.")
    @GetMapping("/collections/daily")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.DailyCollectionDTO> getDailyCollections(
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(reportService.getDailyCollections(date));
    }

    // --- DRILLDOWN: Individual rows for the Daily Collections page ---
    @Operation(summary = "Daily collections line items", description = "Returns individual payment rows for a given date. Requires REPORTS_READ.")
    @GetMapping("/collections/daily/lines")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<List<PaymentLineDTO>> getDailyCollectionLines(
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(reportService.getDailyCollectionLines(date));
    }

    @Operation(summary = "Income report", description = "Returns interest and fee income for a date range. Requires REPORTS_READ.")
    @GetMapping("/income")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.IncomeReportDTO> getIncomeReport(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(reportService.getIncomeReport(from, to));
    }

    // ── General Statement (SAC-263) — true system-wide financial position ────

    @Operation(summary = "General statement", description = "Every posted GL movement, chronologically, across all modules — the true financial position. Requires REPORTS_READ.")
    @GetMapping("/general-statement")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<com.jaytechwave.sacco.modules.reports.api.dto.ReportDTOs.GeneralStatementDTO> getGeneralStatement(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String accountCode) {
        java.time.LocalDate fromDate = from != null ? java.time.LocalDate.parse(from) : null;
        java.time.LocalDate toDate   = to != null ? java.time.LocalDate.parse(to) : null;
        return ResponseEntity.ok(reportService.getGeneralStatement(fromDate, toDate, accountCode));
    }

    @Operation(summary = "Download general statement as CSV", description = "Requires REPORTS_READ.")
    @GetMapping("/general-statement/download")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<byte[]> downloadGeneralStatement(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String accountCode) {

        java.time.LocalDate fromDate = from != null ? java.time.LocalDate.parse(from) : null;
        java.time.LocalDate toDate   = to != null ? java.time.LocalDate.parse(to) : null;
        var statement = reportService.getGeneralStatement(fromDate, toDate, accountCode);

        StringBuilder csv = new StringBuilder();
        csv.append("Date,Reference,Description,Account Code,Account Name,Account Type,Debit (KES),Credit (KES),Running Balance (KES)\n");
        for (var line : statement.getLines()) {
            csv.append(escapeCsv(line.getTransactionDate())).append(',')
               .append(escapeCsv(line.getReference())).append(',')
               .append(escapeCsv(line.getDescription())).append(',')
               .append(escapeCsv(line.getAccountCode())).append(',')
               .append(escapeCsv(line.getAccountName())).append(',')
               .append(escapeCsv(line.getAccountType())).append(',')
               .append(line.getDebitAmount()).append(',')
               .append(line.getCreditAmount()).append(',')
               .append(line.getRunningBalance()).append('\n');
        }

        byte[] body = csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String filename = "general_statement"
                + (from != null ? "_" + from : "") + (to != null ? "_" + to : "") + ".csv";

        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.parseMediaType("text/csv"))
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        org.springframework.http.ContentDisposition.attachment().filename(filename).build().toString())
                .body(body);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    // ── Payment Lookup (SAC-264) — every route one M-Pesa payment touched ────

    @Operation(summary = "Search by M-Pesa or internal reference — see every route a split payment was sent to. Requires REPORTS_READ.")
    @GetMapping("/payment-lookup")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<PaymentRouteLookupResponse> lookupPayment(@RequestParam String reference) {
        return paymentLookupService.lookupByReference(reference)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}