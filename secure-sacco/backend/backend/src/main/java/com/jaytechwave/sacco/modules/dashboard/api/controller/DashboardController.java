package com.jaytechwave.sacco.modules.dashboard.api.controller;

import com.jaytechwave.sacco.modules.dashboard.api.dto.DashboardDTOs;
import com.jaytechwave.sacco.modules.dashboard.api.dto.DashboardDTOs.StaffDashboardDTO;
import com.jaytechwave.sacco.modules.dashboard.domain.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // Secure it purely on REPORTS_READ because V32 proved SYSTEM_ADMIN holds this!
    @GetMapping("/staff")
    @PreAuthorize("hasAuthority('REPORTS_READ')")
    public ResponseEntity<StaffDashboardDTO> getStaffDashboard() {
        return ResponseEntity.ok(dashboardService.getStaffDashboardMetrics());
    }

    @GetMapping("/member")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<DashboardDTOs.MemberDashboardDTO> getMemberDashboard(Authentication authentication) {
        // authentication.getName() securely yields the identifier (email/phone) from the session
        return ResponseEntity.ok(dashboardService.getMemberDashboardMetrics(authentication.getName()));
    }
}