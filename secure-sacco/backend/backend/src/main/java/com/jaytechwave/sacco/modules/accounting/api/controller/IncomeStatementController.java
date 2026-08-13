package com.jaytechwave.sacco.modules.accounting.api.controller;

import com.jaytechwave.sacco.modules.accounting.api.dto.IncomeStatementDTOs.IncomeStatementResponse;
import com.jaytechwave.sacco.modules.accounting.domain.service.IncomeStatementService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/accounting/income-statement")
@RequiredArgsConstructor
public class IncomeStatementController {

    private final IncomeStatementService incomeStatementService;

    @GetMapping
    @PreAuthorize("hasAuthority('GL_TRIAL_BALANCE')")
    public IncomeStatementResponse getIncomeStatement() {
        return incomeStatementService.getIncomeStatement();
    }
}
