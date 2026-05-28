package com.jaytechwave.sacco.modules.core.controller;

import com.jaytechwave.sacco.modules.core.dto.HistoricalMemberRequest;
import com.jaytechwave.sacco.modules.core.service.MigrationService;
import com.jaytechwave.sacco.modules.core.dto.HistoricalLoanDTOs;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Historical data migration endpoints.
 *
 * <p>All endpoints accept either {@code ROLE_SYSTEM_ADMIN} (always authorised)
 * or the grantable {@code DATA_MIGRATION} permission, allowing System Admins to
 * delegate migration duties to trusted staff without giving full admin access.</p>
 */
@RestController
@RequestMapping("/api/v1/migration")
@RequiredArgsConstructor
public class MigrationController {

    private final MigrationService migrationService;

    // ── Members ───────────────────────────────────────────────────────────────

    @PostMapping("/members")
    @PreAuthorize("hasAnyAuthority('DATA_MIGRATION', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> seedHistoricalMember(
            @Valid @RequestBody HistoricalMemberRequest request) {
        String generatedMemberNumber = migrationService.seedHistoricalMember(request);
        return ResponseEntity.ok(Map.of(
                "message", "Historical member migrated successfully",
                "memberNumber", generatedMemberNumber
        ));
    }

    // ── Savings ───────────────────────────────────────────────────────────────

    @PostMapping("/savings")
    @PreAuthorize("hasAnyAuthority('DATA_MIGRATION', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> seedHistoricalSavings(
            @Valid @RequestBody com.jaytechwave.sacco.modules.core.dto.HistoricalSavingsRequest request) {
        String reference = migrationService.seedHistoricalSavings(request);
        return ResponseEntity.ok(Map.of(
                "message", "Historical savings migrated successfully",
                "transactionReference", reference
        ));
    }

    // ── Withdrawals ───────────────────────────────────────────────────────────

    @PostMapping("/withdrawals")
    @PreAuthorize("hasAnyAuthority('DATA_MIGRATION', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> seedHistoricalWithdrawal(
            @Valid @RequestBody com.jaytechwave.sacco.modules.core.dto.HistoricalWithdrawalRequest request) {
        String reference = migrationService.seedHistoricalWithdrawal(request);
        return ResponseEntity.ok(Map.of(
                "message", "Historical withdrawal migrated successfully",
                "transactionReference", reference
        ));
    }

    // ── Loans ─────────────────────────────────────────────────────────────────

    @PostMapping("/loans/disburse")
    @PreAuthorize("hasAnyAuthority('DATA_MIGRATION', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> migrateLoanDisbursement(
            @RequestBody HistoricalLoanDTOs.HistoricalLoanDisbursementRequest request) {
        String loanId = migrationService.seedHistoricalLoanDisbursement(request);
        return ResponseEntity.ok(Map.of("id", loanId));
    }

    @PostMapping("/loans/repay")
    @PreAuthorize("hasAnyAuthority('DATA_MIGRATION', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<String> migrateLoanRepayment(
            @RequestBody HistoricalLoanDTOs.HistoricalLoanRepaymentRequest request) {
        return ResponseEntity.ok(migrationService.seedHistoricalLoanRepayment(request));
    }

    @GetMapping("/loans/active/{memberNumber}")
    @PreAuthorize("hasAnyAuthority('DATA_MIGRATION', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> getActiveLoanId(
            @PathVariable String memberNumber) {
        String loanId = migrationService.getActiveLoanIdByMemberNumber(memberNumber);
        return ResponseEntity.ok(Map.of("id", loanId));
    }

    // ── Penalties ─────────────────────────────────────────────────────────────

    public record HistoricalPenaltyRequest(
            String memberNumber,
            java.math.BigDecimal amount,
            java.time.LocalDate penaltyDate,
            String referenceNumber
    ) {}

    @PostMapping("/penalties/apply")
    @PreAuthorize("hasAnyAuthority('DATA_MIGRATION', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> applyHistoricalPenalty(
            @RequestBody HistoricalPenaltyRequest request) {
        migrationService.migrateHistoricalPenalty(
                request.memberNumber(),
                request.amount(),
                request.penaltyDate(),
                request.referenceNumber()
        );
        return ResponseEntity.ok(Map.of("message", "Historical penalty applied successfully"));
    }

    // ── Cron / Evaluation ─────────────────────────────────────────────────────

    public record CronRequest(java.time.LocalDate evaluationDate) {}

    @PostMapping("/cron/evaluate-penalties")
    @PreAuthorize("hasAnyAuthority('DATA_MIGRATION', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> runTimeMachineCron(
            @RequestBody CronRequest request) {
        return ResponseEntity.ok(migrationService.evaluatePenaltiesUpToDate(request.evaluationDate()));
    }
}