package com.jaytechwave.sacco.modules.core.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record HistoricalMemberRequest(
        @NotBlank(message = "First name is required") String firstName,
        @NotBlank(message = "Last name is required") String lastName,
        @NotBlank(message = "Email is required") @Email String email,
        @NotBlank(message = "Phone number is required") String phoneNumber,
        @NotBlank(message = "Password is required") String plainTextPassword,
        @NotNull(message = "Original registration date is required") LocalDate registrationDate
) {}