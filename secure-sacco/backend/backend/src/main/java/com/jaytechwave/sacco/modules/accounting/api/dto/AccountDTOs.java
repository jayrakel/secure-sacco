package com.jaytechwave.sacco.modules.accounting.api.dto;

import com.jaytechwave.sacco.modules.accounting.domain.entity.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public class AccountDTOs {

    public record CreateAccountRequest(
            @NotBlank(message = "Account code is required")
            @Pattern(regexp = "^[0-9A-Za-z-]+$", message = "Account code must be alphanumeric (dashes allowed)")
            String accountCode,

            @NotBlank(message = "Account name is required")
            String accountName,

            String description,

            @NotNull(message = "Account type is required")
            AccountType accountType,

            UUID parentAccountId
    ) {}

    public record UpdateAccountRequest(
            @NotBlank(message = "Account name is required")
            String accountName,

            String description,
            boolean isActive
    ) {}

    public record AccountResponse(
            UUID id,
            String accountCode,
            String accountName,
            String description,
            AccountType accountType,
            boolean isActive,
            boolean isSystemAccount,
            UUID parentAccountId
    ) {}
}