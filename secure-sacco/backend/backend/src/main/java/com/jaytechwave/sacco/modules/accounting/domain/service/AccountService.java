package com.jaytechwave.sacco.modules.accounting.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.AccountDTOs.*;
import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import com.jaytechwave.sacco.modules.accounting.domain.repository.AccountRepository;
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

        return mapToResponse(accountRepository.save(account));
    }

    public List<AccountResponse> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AccountResponse updateAccount(UUID id, UpdateAccountRequest request) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account not found."));

        if (account.isSystemAccount() && !request.isActive()) {
            throw new IllegalStateException("Cannot deactivate a system account.");
        }

        account.setAccountName(request.accountName());
        account.setDescription(request.description());
        account.setActive(request.isActive());

        return mapToResponse(accountRepository.save(account));
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