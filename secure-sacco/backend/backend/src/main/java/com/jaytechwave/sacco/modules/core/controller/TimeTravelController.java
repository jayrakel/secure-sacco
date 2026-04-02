package com.jaytechwave.sacco.modules.core.controller;

import com.jaytechwave.sacco.modules.core.service.TimeTravelerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * TimeTravelController: REST endpoints for Benjamin's Loan Time-Travel Simulation
 *
 * Endpoints allow manual control of virtual timeline progression for testing
 * loan schedules, refinancing, and restructuring without waiting months in real time.
 *
 * ⚠️  Admin/Dev only — not for production use
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/time-travel")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class TimeTravelController {

    private final TimeTravelerService timeTravelerService;

    /**
     * GET /api/v1/time-travel/status
     *
     * Check current simulation state
     *
     * Response:
     * {
     *   "weeksOffset": 52,
     *   "virtualDate": "2023-10-05",
     *   "progressPercent": 47.3,
     *   "isComplete": false,
     *   "memberNumber": "BVL-2022-000001",
     *   "simulationStart": "2022-10-06",
     *   "simulationEnd": "2025-08-28"
     * }
     */
    @GetMapping("/status")
    public ResponseEntity<TimeTravelerService.TimeTravelState> getStatus() {
        log.info("📊 [ADMIN] Querying time-travel simulation status");
        return ResponseEntity.ok(timeTravelerService.getState());
    }

    /**
     * POST /api/v1/time-travel/advance?days=7
     *
     * Manually advance virtual timeline by N days.
     * Triggers loan schedule progressions automatically.
     *
     * Query params:
     * - days: number of days to advance (default: 7 = 1 week)
     *
     * Response: { "message": "Advanced 7 days. Virtual date: 2023-10-05" }
     */
    @PostMapping("/advance")
    public ResponseEntity<AdvanceResponse> advanceTime(@RequestParam(defaultValue = "7") int days) {
        log.warn("⏱️  [ADMIN] MANUAL TIME TRAVEL: Advancing {} days", days);

        if (days <= 0) {
            return ResponseEntity.badRequest()
                    .body(new AdvanceResponse("Error: days must be > 0"));
        }

        timeTravelerService.advanceVirtualTimeByDays(days);
        var state = timeTravelerService.getState();

        return ResponseEntity.ok(
                new AdvanceResponse(
                        "Advanced " + days + " days. Virtual date: " + state.virtualDate(),
                        state.virtualDate().toString(),
                        String.format("%.1f%%", state.progressPercent())
                )
        );
    }

    /**
     * POST /api/v1/time-travel/reset
     *
     * Reset simulation to initial state (Oct 6, 2022)
     * WARNING: Does NOT reset loan data, only the virtual timeline offset.
     *
     * Response: { "message": "Simulation reset to 2022-10-06" }
     */
    @PostMapping("/reset")
    public ResponseEntity<ResetResponse> resetSimulation() {
        log.warn("🔄 [ADMIN] SIMULATION RESET: Resetting Benjamin's loan timeline to start");

        timeTravelerService.resetSimulation();
        var state = timeTravelerService.getState();

        return ResponseEntity.ok(
                new ResetResponse(
                        "Simulation reset to " + state.simulationStart(),
                        state.simulationStart().toString()
                )
        );
    }

    /**
     * GET /api/v1/time-travel/progress
     *
     * Simple progress indicator (percentage complete)
     *
     * Response: { "progress": 47.3, "complete": false }
     */
    @GetMapping("/progress")
    public ResponseEntity<ProgressResponse> getProgress() {
        var state = timeTravelerService.getState();
        return ResponseEntity.ok(
                new ProgressResponse(state.progressPercent(), state.isComplete())
        );
    }

    /**
     * POST /api/v1/time-travel/configure
     *
     * Configure simulation period for system-wide testing
     *
     * Request body:
     * {
     *   "startDate": "2022-10-06",
     *   "endDate": "2025-08-28",
     *   "daysPerTick": 7
     * }
     *
     * Response: { "message": "Configured simulation period" }
     */
    @PostMapping("/configure")
    public ResponseEntity<ConfigureResponse> configureSim(@RequestBody ConfigureRequest request) {
        log.warn("⏱️  [ADMIN] CONFIGURING TIME-TRAVELER: {} → {}",
                request.startDate(), request.endDate());

        if (request.startDate().isAfter(request.endDate())) {
            return ResponseEntity.badRequest()
                    .body(new ConfigureResponse("Error: startDate must be before endDate"));
        }

        timeTravelerService.configureSimulation(request.startDate(), request.endDate());
        if (request.daysPerTick() > 0) {
            timeTravelerService.setAdvancementRate(request.daysPerTick());
        }

        return ResponseEntity.ok(
                new ConfigureResponse(
                        "Simulation configured: " + request.startDate() + " → " + request.endDate(),
                        request.daysPerTick()
                )
        );
    }

    /**
     * POST /api/v1/time-travel/set-target?memberId=<uuid>
     *
     * (Optional) Focus on specific member's loans
     * If not set, all members' loans are advanced
     *
     * Query param:
     * - memberId: UUID of member to focus on (omit to reset to all members)
     *
     * Response: { "message": "Target member set" }
     */
    @PostMapping("/set-target")
    public ResponseEntity<TargetResponse> setTargetMember(
            @RequestParam(required = false) String memberId) {

        if (memberId == null || memberId.isEmpty()) {
            timeTravelerService.setTargetMember(null);
            return ResponseEntity.ok(
                    new TargetResponse("Target reset: advancing ALL members' loans")
            );
        }

        try {
            java.util.UUID uuid = java.util.UUID.fromString(memberId);
            timeTravelerService.setTargetMember(uuid);
            return ResponseEntity.ok(
                    new TargetResponse("Target member set to: " + memberId)
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new TargetResponse("Invalid member UUID format"));
        }
    }

    /**
     * Response DTO for advance endpoint
     */
    public record AdvanceResponse(
            String message,
            String virtualDate,
            String progressPercent
    ) {
        public AdvanceResponse(String message) {
            this(message, null, null);
        }
    }

    /**
     * Response DTO for reset endpoint
     */
    public record ResetResponse(
            String message,
            String resetDate
    ) {}

    /**
     * Response DTO for progress endpoint
     */
    public record ProgressResponse(
            double progress,
            boolean complete
    ) {}

    /**
     * Request DTO for configure endpoint
     */
    public record ConfigureRequest(
            java.time.LocalDate startDate,
            java.time.LocalDate endDate,
            int daysPerTick
    ) {}

    /**
     * Response DTO for configure endpoint
     */
    public record ConfigureResponse(
            String message,
            int daysPerTick
    ) {
        public ConfigureResponse(String message) {
            this(message, 0);
        }
    }

    /**
     * Response DTO for set-target endpoint
     */
    public record TargetResponse(
            String message
    ) {}
}

