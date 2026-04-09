package com.jaytechwave.sacco.modules.accounting.api.controller;

import com.jaytechwave.sacco.modules.accounting.api.dto.AccountDTOs.*;
import com.jaytechwave.sacco.modules.accounting.domain.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounting/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    /** Create a new GL account. Requires ACCOUNTING_WRITE. */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ACCOUNTING_WRITE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        return ResponseEntity.ok(accountService.createAccount(request));
    }

    /** List all GL accounts. Requires ACCOUNTING_READ. */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ACCOUNTING_READ', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<AccountResponse>> getAllAccounts() {
        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    /** Edit a GL account. Requires ACCOUNTING_WRITE. */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ACCOUNTING_WRITE', 'ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<AccountResponse> updateAccount(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAccountRequest request) {
        return ResponseEntity.ok(accountService.updateAccount(id, request));
    }
}