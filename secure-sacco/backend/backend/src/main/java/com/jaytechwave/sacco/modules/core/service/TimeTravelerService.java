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
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * TimeTravelerService: System-wide time progression simulator for loan testing.
 *
 * Purpose: Advance the virtual timeline for ALL loans in the system without modifying system clock.
 * This allows testing of loan schedule progression, penalty applications, and refinancing
 * workflows in hours/days instead of months/years.
 *
 * Example Use Case: Test Benjamin's 3-loan cycle (Oct 2022 → Aug 2025) by advancing virtual time
 * and verifying that penalties are applied correctly when installments become overdue.
 *
 * Architecture:
 * - Maintains a system-wide virtual timeline offset (number of days/weeks advanced)
 * - Can be configured for custom date ranges or work with existing loans
 * - Each cron tick advances virtual time by a fixed interval
 * - Loan schedule queries use virtual dates instead of system dates
 * - All penalties, overdue tracking, and refinancing use virtual time
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TimeTravelerService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final MemberRepository memberRepository;
    private final LoanScheduleService loanScheduleService;

    /**
     * Virtual timeline reference: simulation start date (can be overridden)
     * Default: Today's date, but can be set to any historical date for testing
     */
    private LocalDate simulationStartDate = LocalDate.now();

    /**
     * Virtual timeline end: when should the simulation stop?
     * Default: 3 years in the future, but can be customized
     */
    private LocalDate simulationEndDate = LocalDate.now().plusYears(3);

    /**
     * Store the offset (number of days advanced in virtual time)
     * Default: 0 days offset means we're at simulationStartDate
     * Each cron run increments this
     */
    private long virtualDaysOffset = 0;

    /**
     * Configuration: which member to focus on (optional, null = all members)
     * Can be set to filter testing to specific member (e.g., Benjamin)
     */
    private UUID targetMemberId = null;

    /**
     * Configuration: how many days to advance per cron tick
     * Default: 7 days (1 week per 6 hours = 4 weeks per day)
     */
    private int daysPerTick = 7;

    /**
     * Calculate current virtual date based on offset
     *
     * @return the date as if days have passed since simulation start
     */
    public LocalDate getVirtualDate() {
        return simulationStartDate.plusDays(virtualDaysOffset);
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
        long daysElapsed = java.time.temporal.ChronoUnit.DAYS.between(simulationStartDate, getVirtualDate());
        long totalDays = java.time.temporal.ChronoUnit.DAYS.between(simulationStartDate, simulationEndDate);
        return totalDays > 0 ? (double) daysElapsed / totalDays * 100 : 0;
    }

    /**
     * Check if simulation has completed (reached end date)
     */
    public boolean isSimulationComplete() {
        return getVirtualDate().isAfter(simulationEndDate) || getVirtualDate().isEqual(simulationEndDate);
    }

    /**
     * Configure simulation for a specific date range
     * Call this BEFORE starting the simulation to set custom dates
     *
     * @param startDate when the simulation should start
     * @param endDate when the simulation should end
     */
    public void configureSimulation(LocalDate startDate, LocalDate endDate) {
        this.simulationStartDate = startDate;
        this.simulationEndDate = endDate;
        log.info("🔧 TIME TRAVELER CONFIGURED: Start={}, End={}, Duration={}",
                startDate, endDate, java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + " days");
    }

    /**
     * Set focus to a specific member (optional)
     * If set, only that member's loans will be progressed
     * If null, ALL members' loans are progressed
     *
     * @param memberId the member to focus on, or null for all members
     */
    public void setTargetMember(UUID memberId) {
        this.targetMemberId = memberId;
        if (memberId != null) {
            memberRepository.findById(memberId).ifPresent(member ->
                    log.info("🎯 TIME TRAVELER TARGET SET: Member {}", member.getMemberNumber())
            );
        } else {
            log.info("🎯 TIME TRAVELER TARGET: All members");
        }
    }

    /**
     * Set how many days advance per cron tick
     *
     * @param days days to advance per tick (e.g., 7 for weekly, 1 for daily)
     */
    public void setAdvancementRate(int days) {
        this.daysPerTick = Math.max(1, days);
        log.info("⏱️  ADVANCEMENT RATE: +{} days per cron tick", daysPerTick);
    }

    /**
     * Advance virtual time by N days (manual trigger for testing)
     *
     * @param days number of days to advance
     */
    @Transactional
    public void advanceVirtualTimeByDays(int days) {
        virtualDaysOffset += days;
        LocalDate newDate = getVirtualDate();
        log.info("⏱️  TIME TRAVEL: Advanced {} days. Virtual date now: {} (Progress: {:.1f}%)",
                days, newDate, String.format("%.1f", getSimulationProgress()));

        // Trigger schedule progression
        triggerScheduleProgression();
    }

    /**
     * Reset simulation to start date
     */
    @Transactional
    public void resetSimulation() {
        virtualDaysOffset = 0;
        log.info("🔄 TIME RESET: Simulation reset to start date: {}", simulationStartDate);
    }

    /**
     * Main cron job: runs every 6 hours, advancing virtual time by configured rate
     *
     * At default 7 days per 6 hours:
     * - 1 day real time = 28 days virtual = 1 month virtual progress
     * - 1 week real time = 7 weeks virtual = 2 months virtual progress
     * - 4 weeks real time = ~4 months virtual progress
     *
     * Cron: "0 0 0,6,12,18 * * *" → 00:00, 06:00, 12:00, 18:00 every day
     */
    @Scheduled(cron = "0 0 0,6,12,18 * * *")
    @Transactional
    public void executeTimeProgressionCheck() {
        if (isSimulationComplete()) {
            log.info("⏸️  Time-travel simulation is COMPLETE (reached {}). Halting progression.",
                    simulationEndDate);
            return;
        }

        try {
            log.info("⏱️  TIME TRAVEL TICK: Advancing virtual timeline by {} days...", daysPerTick);
            advanceVirtualTimeByDays(daysPerTick);

            // Log current state
            LocalDate virtualNow = getVirtualDate();
            double progress = getSimulationProgress();
            log.info("✅ Virtual timeline: {} ({}% complete) | Real time: {}",
                    virtualNow, String.format("%.1f", progress), LocalDate.now());

        } catch (Exception e) {
            log.error("❌ ERROR during time-travel progression: {}", e.getMessage(), e);
        }
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
            List<LoanApplication> loans;

            if (targetMemberId != null) {
                // Focus on specific member
                loans = loanApplicationRepository.findAll().stream()
                        .filter(loan -> loan.getMemberId().equals(targetMemberId))
                        .toList();
                var memberOpt = memberRepository.findById(targetMemberId);
                if (memberOpt.isPresent()) {
                    log.debug("Processing {} loan(s) for member: {}",
                            loans.size(), memberOpt.get().getMemberNumber());
                } else {
                    log.warn("Target member {} not found. Skipping schedule progression.", targetMemberId);
                    return;
                }
            } else {
                // Process ALL loans in system
                loans = loanApplicationRepository.findAll();
                log.debug("Processing {} total loan(s) in system", loans.size());
            }

            for (LoanApplication loan : loans) {
                try {
                    // Advance schedule items that should be DUE by virtual date
                    loanScheduleService.advancePendingInstallmentsAtDate(virtualDate);

                    // Mark overdue items and trigger penalties
                    loanScheduleService.processPastDueInstallmentsAtDate(virtualDate);

                    log.debug("✅ Loan {} processed at virtual date {}", loan.getId(), virtualDate);
                } catch (Exception e) {
                    log.error("ERROR processing loan {}: {}", loan.getId(), e.getMessage());
                }
            }

            log.info("✅ Schedule progression completed for virtual date: {} ({} loans)",
                    virtualDate, loans.size());

        } catch (Exception e) {
            log.error("❌ ERROR in triggerScheduleProgression: {}", e.getMessage(), e);
        }
    }

    /**
     * Export current simulation state (for debugging/UI display)
     */
    public TimeTravelState getState() {
        String memberInfo = targetMemberId != null
                ? memberRepository.findById(targetMemberId)
                    .map(m -> m.getMemberNumber())
                    .orElse("Unknown")
                : "All members";

        return new TimeTravelState(
                virtualDaysOffset,
                getVirtualDate(),
                getSimulationProgress(),
                isSimulationComplete(),
                memberInfo,
                simulationStartDate,
                simulationEndDate,
                daysPerTick
        );
    }

    /**
     * DTO to represent time-travel state
     */
    public record TimeTravelState(
            long daysOffset,
            LocalDate virtualDate,
            double progressPercent,
            boolean isComplete,
            String targetMember,
            LocalDate simulationStart,
            LocalDate simulationEnd,
            int daysPerTick
    ) {}
}

