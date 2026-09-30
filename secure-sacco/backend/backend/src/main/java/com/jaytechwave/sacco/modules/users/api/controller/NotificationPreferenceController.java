package com.jaytechwave.sacco.modules.users.api.controller;

import com.jaytechwave.sacco.modules.users.api.dto.NotificationPreferenceDto;
import com.jaytechwave.sacco.modules.users.domain.service.NotificationPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me/notification-settings")
@RequiredArgsConstructor
public class NotificationPreferenceController {

    private final NotificationPreferenceService notificationPreferenceService;

    @GetMapping
    public ResponseEntity<NotificationPreferenceDto> getPreferences(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notificationPreferenceService.getPreferences(userDetails.getUsername()));
    }

    @PatchMapping
    public ResponseEntity<NotificationPreferenceDto> updatePreferences(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NotificationPreferenceDto dto) {
        return ResponseEntity.ok(notificationPreferenceService.updatePreferences(userDetails.getUsername(), dto));
    }
}
