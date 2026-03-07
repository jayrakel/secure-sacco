package com.jaytechwave.sacco.modules.core.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        String error,
        String message,
        String requestId,
        List<FieldErrorDTO> fields
) {
    public record FieldErrorDTO(String field, String message) {}
}