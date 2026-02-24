package com.jaytechwave.sacco.modules.core.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Email or Phone number is required")
    private String identifier;

    @NotBlank(message = "Password is required")
    private String password;
}