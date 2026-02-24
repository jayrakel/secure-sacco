package com.jaytechwave.sacco.modules.users.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    // This endpoint can ONLY be accessed if the authenticated user has 'USER_READ'
    @PreAuthorize("hasAuthority('USER_READ')")
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(Map.of("message", "You have permission to read users!"));
    }
}