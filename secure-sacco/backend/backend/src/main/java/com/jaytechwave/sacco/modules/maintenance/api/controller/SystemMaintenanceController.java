package com.jaytechwave.sacco.modules.maintenance.api.controller;

import com.jaytechwave.sacco.modules.maintenance.api.dto.SystemMaintenanceDTOs.CreateMaintenanceRequest;
import com.jaytechwave.sacco.modules.maintenance.domain.service.SystemMaintenanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/maintenance")
@RequiredArgsConstructor
@Tag(name = "Maintenance", description = "System maintenance and announcements")
public class SystemMaintenanceController {

    private final SystemMaintenanceService maintenanceService;

    @Operation(summary = "Schedule new system maintenance", description = "Admin only")
    @PostMapping
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public ResponseEntity<?> scheduleMaintenance(
            @Valid @RequestBody CreateMaintenanceRequest req,
            Authentication auth, HttpServletRequest httpReq) {
        
        try {
            var response = maintenanceService.createMaintenance(req, auth.getName(), getClientIP(httpReq));
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Get all maintenance events", description = "Admin only")
    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public ResponseEntity<?> getAllMaintenance() {
        return ResponseEntity.ok(maintenanceService.getAllMaintenance());
    }

    @Operation(summary = "Get active or upcoming maintenance", description = "Public/Authenticated users to show in app")
    @GetMapping("/active")
    public ResponseEntity<?> getActiveMaintenance() {
        return ResponseEntity.ok(maintenanceService.getActiveOrUpcomingMaintenance());
    }

    private String getClientIP(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf == null || xf.isEmpty() || !xf.contains(request.getRemoteAddr()))
            return request.getRemoteAddr();
        return xf.split(",")[0];
    }
}
