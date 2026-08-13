package com.jaytechwave.sacco.modules.accounting.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounting/reconciliation/bank")
@RequiredArgsConstructor
@Tag(name = "Accounting", description = "Bank Reconciliation")
public class BankReconciliationController {

    private final JdbcTemplate jdbcTemplate;

    public record BankStatementLine(
            LocalDate date,
            String description,
            String reference,
            BigDecimal amount,
            String matchStatus,
            String matchedJournalEntryId
    ) {}

    public record BankReconciliationResponse(
            List<BankStatementLine> lines,
            BigDecimal totalMatched,
            BigDecimal totalUnmatched
    ) {}

    @Operation(summary = "Upload Bank Statement", description = "Upload a CSV bank statement to reconcile against internal journal entries.")
    @PostMapping("/upload")
    @PreAuthorize("hasAuthority('GL_RECONCILIATION')")
    public ResponseEntity<BankReconciliationResponse> uploadBankStatement(@RequestParam("file") MultipartFile file) {
        
        List<BankStatementLine> parsedLines = new ArrayList<>();
        BigDecimal totalMatched = BigDecimal.ZERO;
        BigDecimal totalUnmatched = BigDecimal.ZERO;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean isHeader = true;
            
            while ((line = reader.readLine()) != null) {
                if (isHeader) {
                    isHeader = false;
                    continue;
                }
                
                String[] parts = line.split(",");
                if (parts.length >= 4) {
                    LocalDate date = LocalDate.parse(parts[0].trim(), DateTimeFormatter.ISO_LOCAL_DATE);
                    String description = parts[1].trim();
                    String reference = parts[2].trim();
                    BigDecimal amount = new BigDecimal(parts[3].trim());

                    // Try to match in journal_entries
                    String sql = """
                        SELECT id FROM journal_entries 
                        WHERE status = 'POSTED'
                        AND transaction_date >= ? AND transaction_date <= ?
                        AND (reference_number = ? OR description ILIKE ?)
                        LIMIT 1
                        """;
                    
                    List<Map<String, Object>> matches = jdbcTemplate.queryForList(
                            sql, 
                            date.minusDays(2), date.plusDays(2), 
                            reference, "%" + reference + "%"
                    );

                    String matchStatus = "UNMATCHED";
                    String matchedJeId = null;

                    if (!matches.isEmpty()) {
                        matchStatus = "MATCHED";
                        matchedJeId = matches.get(0).get("id").toString();
                        totalMatched = totalMatched.add(amount);
                    } else {
                        totalUnmatched = totalUnmatched.add(amount);
                    }

                    parsedLines.add(new BankStatementLine(date, description, reference, amount, matchStatus, matchedJeId));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to process bank statement: " + e.getMessage());
        }

        return ResponseEntity.ok(new BankReconciliationResponse(parsedLines, totalMatched, totalUnmatched));
    }
}
