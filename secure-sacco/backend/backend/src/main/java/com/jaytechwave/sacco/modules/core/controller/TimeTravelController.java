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
     * POST /api/v1/time-travel/advance?weeks=4
     *
     * Manually advance virtual timeline by N weeks.
     * Triggers loan schedule progressions automatically.
     *
     * Query params:
     * - weeks: number of weeks to advance (default: 1)
     *
     * Response: { "message": "Advanced 4 weeks. Virtual date: 2023-10-05" }
     */
    @PostMapping("/advance")
    public ResponseEntity<AdvanceResponse> advanceTime(@RequestParam(defaultValue = "1") int weeks) {
        log.warn("⏱️  [ADMIN] MANUAL TIME TRAVEL: Advancing {} weeks", weeks);

        if (weeks <= 0) {
            return ResponseEntity.badRequest()
                    .body(new AdvanceResponse("Error: weeks must be > 0"));
        }

        timeTravelerService.advanceVirtualTimeByWeeks(weeks);
        var state = timeTravelerService.getState();

        return ResponseEntity.ok(
                new AdvanceResponse(
                        "Advised " + weeks + " weeks. Virtual date: " + state.virtualDate(),
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
}

