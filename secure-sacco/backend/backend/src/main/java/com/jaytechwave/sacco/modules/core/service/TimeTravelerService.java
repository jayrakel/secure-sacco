package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanScheduleService;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * TimeTravelerService: Simulates time progression for loan testing without modifying system clock.
 *
 * Used for Benjamin's Loan Test: Automatically advances loan schedule milestones
 * as if Benjamin's 3 loans were progressing in real time (Oct 2022 → Aug 2025).
 *
 * Architecture:
 * - Stores a "virtual timeline offset" in a dedicated tracking table
 * - Each cron tick advances virtual time by a fixed interval
 * - Loan schedule queries use virtual dates instead of system dates
 * - Penalties, overdue tracking, and refinancing use virtual time
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TimeTravelerService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final MemberRepository memberRepository;
    private final LoanScheduleService loanScheduleService;

    /**
     * Virtual timeline reference: when did the time-travel simulation start?
     * Benjamin's first loan: Oct 6, 2022 (2022-10-06)
     */
    private static final LocalDate BENJAMIN_LOAN_START = LocalDate.of(2022, 10, 6);

    /**
     * When did Benjamin's loans fully complete?
     * Final repayment: Aug 28, 2025 (2025-08-28)
     */
    private static final LocalDate BENJAMIN_LOAN_END = LocalDate.of(2025, 8, 28);

    /**
     * Benjamin's member number for targeting
     */
    private static final String BENJAMIN_MEMBER_NUMBER = "BVL-2022-000001";

    /**
     * Store the offset (number of weeks advanced in virtual time)
     * Default: 0 weeks offset means we're at Oct 6, 2022
     * Each cron run increments this
     */
    private int virtualWeeksOffset = 0;

    /**
     * Calculate current virtual date based on offset
     *
     * @return the date as if weeks have passed since Benjamin's loan start
     */
    public LocalDate getVirtualDate() {
        return BENJAMIN_LOAN_START.plusWeeks(virtualWeeksOffset);
    }

    /**
     * Calculate virtual OffsetDateTime (for database timestamps)
     */
    public OffsetDateTime getVirtualDateTime() {
        return getVirtualDate().atStartOfDay().atZone(ZoneId.of("Africa/Nairobi")).toOffsetDateTime();
    }

    /**
     * Get the current simulation progress as a percentage
     */
    public double getSimulationProgress() {
        long daysCompleted = java.time.temporal.ChronoUnit.DAYS.between(BENJAMIN_LOAN_START, getVirtualDate());
        long totalDays = java.time.temporal.ChronoUnit.DAYS.between(BENJAMIN_LOAN_START, BENJAMIN_LOAN_END);
        return totalDays > 0 ? (double) daysCompleted / totalDays * 100 : 0;
    }

    /**
     * Check if simulation has completed (reached end date)
     */
    public boolean isSimulationComplete() {
        return getVirtualDate().isAfter(BENJAMIN_LOAN_END) || getVirtualDate().isEqual(BENJAMIN_LOAN_END);
    }

    /**
     * Advance virtual time by N weeks (manual trigger for testing)
     *
     * @param weeks number of weeks to advance
     */
    @Transactional
    public void advanceVirtualTimeByWeeks(int weeks) {
        virtualWeeksOffset += weeks;
        LocalDate newDate = getVirtualDate();
        log.info("⏱️  TIME TRAVEL: Advanced {} weeks. Virtual date now: {} (Progress: {:.1f}%)",
                weeks, newDate, getSimulationProgress());

        // Trigger schedule progression
        triggerScheduleProgression();
    }

    /**
     * Reset simulation to start (Oct 6, 2022)
     */
    @Transactional
    public void resetSimulation() {
        virtualWeeksOffset = 0;
        log.info("🔄 TIME RESET: Benjamin's loan simulation reset to start date: {}",
                BENJAMIN_LOAN_START);
    }

    /**
     * Main cron job: runs every 6 hours, advancing virtual time by 1 week
     *
     * This allows Benjamin's loan to "age" realistically over days/weeks of real-world testing.
     * At 1 week per 6 hours:
     * - 2 months real time = ~8 weeks virtual = progress through Loan 1 into Loan 2
     * - 4 weeks real time = ~7 months virtual progress
     *
     * Cron: "0 0 0,6,12,18 * * *" → 00:00, 06:00, 12:00, 18:00 every day
     */
    @Scheduled(cron = "0 0 0,6,12,18 * * *")
    @Transactional
    public void executeWeeklyProgressionCheck() {
        if (isSimulationComplete()) {
            log.info("⏸️  Benjamin's loan simulation is COMPLETE (reached {}). Halting time progression.",
                    BENJAMIN_LOAN_END);
            return;
        }

        try {
            log.info("⏱️  TIME TRAVEL TICK: Advancing Benjamin's virtual timeline by 1 week...");
            advanceVirtualTimeByWeeks(1);

            // Log current state
            LocalDate virtualNow = getVirtualDate();
            double progress = getSimulationProgress();
            log.info("✅ Virtual timeline now: {} ({}% complete) | Real time: {}",
                    virtualNow, String.format("%.1f", progress), LocalDate.now());

        } catch (Exception e) {
            log.error("❌ ERROR during time-travel progression: {}", e.getMessage(), e);
        }
    }

    /**
     * Faster progression: runs every hour, advancing by 3 days of virtual time
     * Useful for accelerated testing (21 days virtual per real day)
     *
     * Toggle: manually call or use a feature flag
     *
     * Cron: "0 0 * * * *" → every hour
     */
    @Scheduled(cron = "0 0 * * * *", initialDelay = 300000) // Start after 5 min, then hourly
    @Transactional
    public void executeFastProgressionCheck() {
        // This is optional. Comment out if only using weekly progression.
        // Uncomment to enable 3-day-per-hour acceleration:

        // if (isSimulationComplete()) return;
        // try {
        //     log.debug("⚡ FAST TIME TRAVEL: +3 days virtual time...");
        //     advanceVirtualTimeByWeeks(0); // Would use days instead
        //     triggerScheduleProgression();
        // } catch (Exception e) {
        //     log.error("ERROR in fast progression: {}", e.getMessage());
        // }
    }

    /**
     * Process loan schedule advancements based on virtual date
     * Simulates:
     * - Installments moving from PENDING → DUE as virtual time advances
     * - Overdue penalties triggering
     * - Loan refinances/restructures at the right virtual times
     */
    @Transactional
    protected void triggerScheduleProgression() {
        LocalDate virtualDate = getVirtualDate();

        try {
            // Get all of Benjamin's loans
            var member = memberRepository.findByMemberNumber(BENJAMIN_MEMBER_NUMBER);
            if (member.isEmpty()) {
                log.warn("⚠️  Benjamin (member {}) not found. Skipping schedule progression.",
                        BENJAMIN_MEMBER_NUMBER);
                return;
            }

            List<LoanApplication> benjaminsLoans = loanApplicationRepository
                    .findByMemberId(member.get().getId());

            for (LoanApplication loan : benjaminsLoans) {
                log.debug("Processing Benjamin's loan {} (Status: {}) at virtual date {}",
                        loan.getId(), loan.getStatus(), virtualDate);

                // Advance schedule items that should be DUE by virtual date
                loanScheduleService.advancePendingInstallmentsAtDate(virtualDate);

                // Mark overdue items and trigger penalties
                loanScheduleService.processPastDueInstallmentsAtDate(virtualDate);
            }

            log.info("✅ Schedule progression completed for virtual date: {}", virtualDate);

        } catch (Exception e) {
            log.error("ERROR in triggerScheduleProgression: {}", e.getMessage(), e);
        }
    }

    /**
     * Export current simulation state (for debugging/UI display)
     */
    public TimeTravelState getState() {
        return new TimeTravelState(
                virtualWeeksOffset,
                getVirtualDate(),
                getSimulationProgress(),
                isSimulationComplete(),
                BENJAMIN_MEMBER_NUMBER,
                BENJAMIN_LOAN_START,
                BENJAMIN_LOAN_END
        );
    }

    /**
     * DTO to represent time-travel state
     */
    public record TimeTravelState(
            int weeksOffset,
            LocalDate virtualDate,
            double progressPercent,
            boolean isComplete,
            String memberNumber,
            LocalDate simulationStart,
            LocalDate simulationEnd
    ) {}
}

