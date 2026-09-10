package com.jaytechwave.sacco.modules.accounting.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.AccountDTOs.*;
import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import com.jaytechwave.sacco.modules.accounting.domain.repository.AccountRepository;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final SecurityAuditService securityAuditService;

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request) {
        if (accountRepository.existsByAccountCode(request.accountCode())) {
            throw new IllegalArgumentException("Account code already exists.");
        }

        if (request.parentAccountId() != null && !accountRepository.existsById(request.parentAccountId())) {
            throw new IllegalArgumentException("Parent account does not exist.");
        }

        Account account = Account.builder()
                .accountCode(request.accountCode())
                .accountName(request.accountName())
                .description(request.description())
                .accountType(request.accountType())
                .parentAccountId(request.parentAccountId())
                .isActive(true)
                .isSystemAccount(false) // Only seeded accounts should be system accounts
                .build();
        account = accountRepository.save(account);
        securityAuditService.logEvent("ACCOUNT_CREATED", account.getId().toString(), "Account created: " + account.getAccountCode());
        return mapToResponse(account);
    }

    public List<AccountResponse> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public AccountResponse getAccount(UUID id) {
        return accountRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new IllegalArgumentException("Account not found."));
    }

    @Transactional
    public AccountResponse updateAccount(UUID id, UpdateAccountRequest request) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account not found."));

        if (account.isSystemAccount() && !request.isActive()) {
            throw new IllegalStateException("Cannot deactivate a system account.");
        }

        // Validate parent account if provided
        if (request.parentAccountId() != null) {
            if (request.parentAccountId().equals(id)) {
                throw new IllegalArgumentException("An account cannot be its own parent.");
            }
            if (!accountRepository.existsById(request.parentAccountId())) {
                throw new IllegalArgumentException("Parent account does not exist.");
            }
        }

        account.setAccountName(request.accountName());
        account.setDescription(request.description());
        account.setActive(request.isActive());
        account.setParentAccountId(request.parentAccountId());
        account = accountRepository.save(account);
        securityAuditService.logEvent("ACCOUNT_UPDATED", account.getId().toString(), "Account updated: " + account.getAccountCode());
        return mapToResponse(account);
    }

    private AccountResponse mapToResponse(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getAccountCode(),
                account.getAccountName(),
                account.getDescription(),
                account.getAccountType(),
                account.isActive(),
                account.isSystemAccount(),
                account.getParentAccountId()
        );
    }
}