package com.jaytechwave.sacco.modules.dashboard.api.controller;

import com.jaytechwave.sacco.modules.dashboard.api.dto.DashboardDTOs;
import com.jaytechwave.sacco.modules.dashboard.api.dto.DashboardDTOs.StaffDashboardDTO;
import com.jaytechwave.sacco.modules.dashboard.domain.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Dashboard", description = "Aggregated SACCO metrics for staff and member dashboards")
public class DashboardController {

    private final DashboardService dashboardService;

    // Accessible to any authenticated staff user (anyone who is not exclusively a ROLE_MEMBER).
    @Operation(summary = "Staff dashboard metrics", description = "Returns 15 aggregated KPIs for the staff dashboard. Cached in Redis for 5 minutes. Requires any staff role.")
    @GetMapping("/staff")
    @PreAuthorize("isAuthenticated() && !hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<StaffDashboardDTO> getStaffDashboard() {
        return ResponseEntity.ok(dashboardService.getStaffDashboardMetrics());
    }

    @Operation(summary = "Member dashboard metrics", description = "Returns personalised KPIs for the authenticated member. Requires ROLE_MEMBER.")
    @GetMapping("/member")
    @PreAuthorize("hasAuthority('ROLE_MEMBER')")
    public ResponseEntity<DashboardDTOs.MemberDashboardDTO> getMemberDashboard(Authentication authentication) {
        // authentication.getName() securely yields the identifier (email/phone) from the session
        return ResponseEntity.ok(dashboardService.getMemberDashboardMetrics(authentication.getName()));
    }
}