package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanScheduleService;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.penalties.job.PenaltyJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.LocalDate;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.time-travel.enabled", havingValue = "true")
public class TimeTravelerService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final MigrationService migrationService;
    private final MemberRepository memberRepository;
    private final LoanScheduleService loanScheduleService;
    private final PenaltyJob penaltyJob;
    private final JdbcTemplate jdbcTemplate;     // 🟢 Add this
    private final EntityManager entityManager;

    // --- State Variables ---
    private LocalDate simulationStartDate = LocalDate.of(2022, 10, 6);
    private LocalDate simulationEndDate = LocalDate.of(2025, 8, 28);
    private long virtualDaysOffset = 0;
    private UUID targetMemberId = null;
    private int daysPerTick = 7;

    // --- Core Time Calculations ---

    public LocalDate getVirtualDate() {
        return simulationStartDate.plusDays(virtualDaysOffset);
    }

    public OffsetDateTime getVirtualDateTime() {
        return getVirtualDate().atStartOfDay().atZone(ZoneId.of("Africa/Nairobi")).toOffsetDateTime();
    }

    public double getSimulationProgress() {
        long daysElapsed = java.time.temporal.ChronoUnit.DAYS.between(simulationStartDate, getVirtualDate());
        long totalDays = java.time.temporal.ChronoUnit.DAYS.between(simulationStartDate, simulationEndDate);
        if (totalDays <= 0) return 100.0;
        double progress = (double) daysElapsed / totalDays * 100;
        return Math.min(100.0, Math.max(0.0, progress));
    }

    public boolean isSimulationComplete() {
        return getVirtualDate().isAfter(simulationEndDate) || getVirtualDate().isEqual(simulationEndDate);
    }

    // --- Configuration ---

    public void configureSimulation(LocalDate startDate, LocalDate endDate) {
        this.simulationStartDate = startDate;
        this.simulationEndDate = endDate;
        log.info("🔧 TIME TRAVELER CONFIGURED: Start={}, End={}", startDate, endDate);
    }

    public void setTargetMember(UUID memberId) {
        this.targetMemberId = memberId;
        log.info("🎯 TIME TRAVELER TARGET SET");
    }

    public void setAdvancementRate(int days) {
        this.daysPerTick = Math.max(1, days);
    }

    @Transactional
    public void resetSimulation() {
        this.virtualDaysOffset = 0;
        log.info("🔄 TIME RESET: Simulation reset to {}", simulationStartDate);
    }

    // --- The Engine ---

    @Transactional
    public void advanceVirtualTimeByDays(int days) {

        for (int i = 0; i < days; i++) {
            // 1. Advance the clock by exactly 1 day
            this.virtualDaysOffset += 1;
            LocalDate currentVirtualDate = getVirtualDate();

            // 2. Trigger business logic (These will create records stamped with real-time April 2026)
            triggerScheduleProgression(currentVirtualDate);
            penaltyJob.executeDailyPenaltyInterestAccrual();

            // 3. 🚨 CRITICAL: Force Hibernate to write the new penalties to PostgreSQL immediately!
            // If we don't flush, the JDBC updates below won't see the new records.
            entityManager.flush();

            // 4. 🟢 THE TIME MACHINE VACUUM
            // Instantly sweep the database and backdate anything created in the last millisecond to the historical date
            Timestamp virtualTs = Timestamp.valueOf(currentVirtualDate.atStartOfDay());

            // Sweep Base Penalties
            jdbcTemplate.update(
                    "UPDATE penalties SET created_at = ?, updated_at = ? WHERE CAST(created_at AS DATE) = CURRENT_DATE",
                    virtualTs, virtualTs);

            // Sweep Daily Penalty Accruals
            jdbcTemplate.update(
                    "UPDATE penalty_accruals SET created_at = ?, updated_at = ? WHERE CAST(created_at AS DATE) = CURRENT_DATE",
                    virtualTs, virtualTs);

            // Sweep the Accounting Ledger (So the statement orders them perfectly!)
            jdbcTemplate.update(
                    "UPDATE journal_entries SET transaction_date = ?, created_at = ?, updated_at = ? WHERE CAST(created_at AS DATE) = CURRENT_DATE",
                    virtualTs, virtualTs, virtualTs);
        }

        log.info("🕰️ TIME TRAVEL: Clock advanced {} days to {} (Progress: {:.1f}%)",
                days, getVirtualDate(), getSimulationProgress());
    }

    // --- Internal Helpers ---

    private void triggerScheduleProgression(LocalDate virtualDate) {
        List<LoanApplication> loans = (targetMemberId != null)
                ? loanApplicationRepository.findAll().stream().filter(l -> l.getMemberId().equals(targetMemberId)).toList()
                : loanApplicationRepository.findAll();

        for (LoanApplication loan : loans) {
            try {
                // IMPORTANT: Ensure these methods in LoanScheduleService actually accept and use the virtualDate!
                loanScheduleService.advancePendingInstallmentsAtDate(virtualDate);
                loanScheduleService.processPastDueInstallmentsAtDate(virtualDate);
            } catch (Exception e) {
                log.error("ERROR processing schedule for loan {}: {}", loan.getId(), e.getMessage());
            }
        }
    }

    // --- DTOs ---

    public TimeTravelState getState() {
        String memberInfo = targetMemberId != null ? targetMemberId.toString() : "All members";
        return new TimeTravelState(
                virtualDaysOffset, getVirtualDate(), getSimulationProgress(),
                isSimulationComplete(), memberInfo, simulationStartDate, simulationEndDate, daysPerTick
        );
    }

    public record TimeTravelState(
            long daysOffset, LocalDate virtualDate, double progressPercent,
            boolean isComplete, String targetMember, LocalDate simulationStart,
            LocalDate simulationEnd, int daysPerTick
    ) {}
}