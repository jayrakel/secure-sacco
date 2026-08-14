package com.jaytechwave.sacco.modules.expense.api.controller;

import com.jaytechwave.sacco.modules.expense.api.dto.SaccoExpenseDTOs.*;
import com.jaytechwave.sacco.modules.expense.domain.service.SaccoExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounting/sacco-expenses")
@RequiredArgsConstructor
public class SaccoExpenseController {

    private final SaccoExpenseService saccoExpenseService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")
    public SaccoExpenseResponse recordExpense(
            @Valid @RequestBody RecordSaccoExpenseRequest request,
            Authentication authentication
    ) {
        return saccoExpenseService.recordExpense(request, authentication.getName());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ACCOUNTING_READ')")
    public List<SaccoExpenseResponse> listExpenses() {
        return saccoExpenseService.listAll();
    }
}
