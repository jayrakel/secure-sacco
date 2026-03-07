package com.jaytechwave.sacco.modules.core.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Helper to grab the UUID we injected in SecurityHeadersFilter
    private String getRequestId() {
        String requestId = MDC.get("requestId");
        return requestId != null ? requestId : "UNKNOWN";
    }

    // 1. Validation Failures (400)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        log.warn("Validation Failed [{}]: {}", getRequestId(), ex.getMessage());

        List<ErrorResponse.FieldErrorDTO> fields = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> new ErrorResponse.FieldErrorDTO(error.getField(), error.getDefaultMessage()))
                .toList();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("Validation failed", null, null, fields));
    }

    // 2. Bad Requests / Business Logic Rules (400)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Bad Request [{}]: {}", getRequestId(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("Bad request", ex.getMessage(), null, null));
    }

    // 3. State Conflicts (409)
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(IllegalStateException ex) {
        log.warn("Conflict [{}]: {}", getRequestId(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("Conflict", ex.getMessage(), null, null));
    }

    // 4. Resource Not Found (404) - Sanitized completely
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ErrorResponse> handleNoSuchElementException(NoSuchElementException ex) {
        log.warn("Not Found [{}]: {}", getRequestId(), ex.getMessage());
        // Force generic message to prevent DB ID enumeration/leakage
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("Not found", null, null, null));
    }

    // 5. Authentication Failure (401) - Sanitized completely
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex) {
        log.warn("Unauthorized [{}]: {}", getRequestId(), ex.getMessage());
        // Do not return token expiry details or "user not found" messages
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("Unauthorized", null, null, null));
    }

    // 6. Access Denied / RBAC Failure (403) - Sanitized completely
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex) {
        log.warn("Forbidden Access [{}]: {}", getRequestId(), ex.getMessage());
        // Do not return which role/permission was required
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("Forbidden", null, null, null));
    }

    // 7. Catch-All for Unhandled Bugs / Server Errors (500) - The Ultimate Shield
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAllOtherExceptions(Exception ex) {
        String requestId = getRequestId();

        // LOG FULL STACK TRACE INTERNALLY
        log.error("CRITICAL Internal Server Error [Request ID: {}]", requestId, ex);

        // RETURN ABSOLUTELY NOTHING SENSITIVE TO THE CLIENT
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Internal error", null, requestId, null));
    }
}