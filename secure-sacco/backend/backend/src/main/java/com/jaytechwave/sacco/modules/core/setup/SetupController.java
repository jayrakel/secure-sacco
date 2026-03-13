package com.jaytechwave.sacco.modules.core.setup;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Public endpoints that the frontend polls to drive the setup wizard.
 *
 * <p>{@code GET /api/v1/setup/status} is intentionally unauthenticated so
 * the React router can check whether to redirect an anonymous visitor to
 * the setup wizard or the normal login screen.
 */
@RestController
@RequestMapping("/api/v1/setup")
@RequiredArgsConstructor
public class SetupController {

    private final SetupService setupService;

    /**
     * Returns the current setup phase and whether setup is complete.
     * <p>This endpoint is public — no authentication required.
     *
     * <p>Response:
     * <pre>{
     *   "phase": "VERIFY_CONTACT",
     *   "complete": false,
     *   "missingOfficerRoles": []
     * }</pre>
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        SetupPhase phase = setupService.currentPhase();
        List<String> missing = phase == SetupPhase.CREATE_OFFICERS
                ? setupService.missingOfficerRoles()
                : List.of();

        return ResponseEntity.ok(Map.of(
                "phase",               phase.name(),
                "complete",            phase == SetupPhase.COMPLETE,
                "missingOfficerRoles", missing
        ));
    }
}