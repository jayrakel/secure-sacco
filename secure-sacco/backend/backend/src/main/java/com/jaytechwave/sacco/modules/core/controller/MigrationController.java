package com.jaytechwave.sacco.modules.core.controller;

import com.jaytechwave.sacco.modules.core.dto.HistoricalMemberRequest;
import com.jaytechwave.sacco.modules.core.service.MigrationService;
import com.jaytechwave.sacco.modules.core.dto.HistoricalLoanDTOs;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/migration")
@RequiredArgsConstructor
public class MigrationController {

    private final MigrationService migrationService;

    @PostMapping("/members")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')") // STRICTLY ADMIN ONLY
    public ResponseEntity<Map<String, String>> seedHistoricalMember(@Valid @RequestBody HistoricalMemberRequest request) {
        String generatedMemberNumber = migrationService.seedHistoricalMember(request);
        return ResponseEntity.ok(Map.of(
                "message", "Historical member migrated successfully",
                "memberNumber", generatedMemberNumber
        ));
    }

    @PostMapping("/savings")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<java.util.Map<String, String>> seedHistoricalSavings(@Valid @RequestBody com.jaytechwave.sacco.modules.core.dto.HistoricalSavingsRequest request) {
        String reference = migrationService.seedHistoricalSavings(request);
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Historical savings migrated successfully",
                "transactionReference", reference
        ));
    }

    @PostMapping("/withdrawals")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> seedHistoricalWithdrawal(
            @Valid @RequestBody com.jaytechwave.sacco.modules.core.dto.HistoricalWithdrawalRequest request) {
        String reference = migrationService.seedHistoricalWithdrawal(request);
        return ResponseEntity.ok(Map.of(
                "message", "Historical withdrawal migrated successfully",
                "transactionReference", reference
        ));
    }

    @PostMapping("/loans/disburse")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<String> migrateLoanDisbursement(@RequestBody HistoricalLoanDTOs.HistoricalLoanDisbursementRequest request) {
        return ResponseEntity.ok(migrationService.seedHistoricalLoanDisbursement(request));
    }

    @PostMapping("/loans/repay")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<String> migrateLoanRepayment(@RequestBody HistoricalLoanDTOs.HistoricalLoanRepaymentRequest request) {
        return ResponseEntity.ok(migrationService.seedHistoricalLoanRepayment(request));
    }

    // The DTO for the Penalty Request
    public record HistoricalPenaltyRequest(
            String memberNumber,
            java.math.BigDecimal amount,
            java.time.LocalDate penaltyDate,
            String referenceNumber
    ) {}

    // The Endpoint
    @PostMapping("/penalties/apply")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> applyHistoricalPenalty(@RequestBody HistoricalPenaltyRequest request) {
        migrationService.migrateHistoricalPenalty(
                request.memberNumber(),
                request.amount(),
                request.penaltyDate(),
                request.referenceNumber()
        );
        return ResponseEntity.ok(Map.of(
                "message", "Historical penalty applied successfully"
        ));
    }
}