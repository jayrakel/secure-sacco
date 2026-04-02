package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus;
import com.jaytechwave.sacco.modules.loans.domain.event.LoanInstallmentOverdueEvent;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanScheduleItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanScheduleService {

    private final LoanScheduleItemRepository scheduleItemRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void generateWeeklySchedule(LoanApplication application) {
        int termWeeks = application.getTermWeeks();
        int gracePeriod = application.getLoanProduct().getGracePeriodDays();

        // Schedule starts ticking after grace period
        LocalDate scheduleStartDate = application.getDisbursedAt().toLocalDate().plusDays(gracePeriod);

        BigDecimal principal = application.getPrincipalAmount();

        // 1. Get the Annual Interest Rate (e.g. 10.00%)
        BigDecimal annualRateDecimal = application.getLoanProduct().getInterestRate()
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        // 2. Calculate the "Years Factor" (e.g. 104 weeks / 52 weeks = 2.0 years)
        BigDecimal yearsFactor = BigDecimal.valueOf(termWeeks)
                .divide(BigDecimal.valueOf(52), 4, RoundingMode.HALF_UP);

        // 3. Total Interest = Principal * Annual Rate * Years Factor
        BigDecimal totalInterest = principal
                .multiply(annualRateDecimal)
                .multiply(yearsFactor)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal principalPerWeek = principal.divide(BigDecimal.valueOf(termWeeks), 2, RoundingMode.HALF_UP);
        BigDecimal interestPerWeek = totalInterest.divide(BigDecimal.valueOf(termWeeks), 2, RoundingMode.HALF_UP);

        BigDecimal principalAccumulated = BigDecimal.ZERO;
        BigDecimal interestAccumulated = BigDecimal.ZERO;

        for (int week = 1; week <= termWeeks; week++) {
            // First installment is due 7 days after the start date
            LocalDate dueDate = scheduleStartDate.plusWeeks(week);

            // Handle the final week rounding remainder to ensure exact total repayment
            BigDecimal currentPrincipal = (week == termWeeks) ? principal.subtract(principalAccumulated) : principalPerWeek;
            BigDecimal currentInterest = (week == termWeeks) ? totalInterest.subtract(interestAccumulated) : interestPerWeek;

            LoanScheduleItem item = LoanScheduleItem.builder()
                    .loanApplication(application)
                    .weekNumber(week)
                    .dueDate(dueDate)
                    .principalDue(currentPrincipal)
                    .interestDue(currentInterest)
                    .totalDue(currentPrincipal.add(currentInterest))
                    .principalPaid(BigDecimal.ZERO)
                    .interestPaid(BigDecimal.ZERO)
                    .status(week == 1 ? LoanScheduleStatus.DUE : LoanScheduleStatus.PENDING)
                    .build();

            scheduleItemRepository.save(item);

            principalAccumulated = principalAccumulated.add(currentPrincipal);
            interestAccumulated = interestAccumulated.add(currentInterest);
        }

        log.info("Generated {} weekly schedule items for Loan Application {}", termWeeks, application.getId());
    }

    @Transactional
    public void advancePendingInstallments() {
        LocalDate today = LocalDate.now();
        // Move to DUE if due date is within the current active week (7 days)
        List<LoanScheduleItem> pendingToDue = scheduleItemRepository.findByStatusAndDueDateLessThanEqual(
                LoanScheduleStatus.PENDING, today.plusDays(7));

        for (LoanScheduleItem item : pendingToDue) {
            item.setStatus(LoanScheduleStatus.DUE);
            scheduleItemRepository.save(item);
            log.info("Advanced schedule item {} to DUE", item.getId());
        }
    }

    @Transactional
    public void processPastDueInstallments() {
        // Find everything strictly before today that is still marked PENDING or DUE
        List<LoanScheduleItem> pastDueItems = scheduleItemRepository.findByDueDateBeforeAndStatusIn(
                LocalDate.now(),
                List.of(LoanScheduleStatus.PENDING, LoanScheduleStatus.DUE)
        );

        for (LoanScheduleItem item : pastDueItems) {
            BigDecimal totalPaid = item.getPrincipalPaid().add(item.getInterestPaid());
            BigDecimal shortfall = item.getTotalDue().subtract(totalPaid);

            if (shortfall.compareTo(BigDecimal.ZERO) > 0) {
                // Member did not fully pay this installment!
                item.setStatus(LoanScheduleStatus.OVERDUE);
                scheduleItemRepository.save(item);

                // Shout to the PEN module to apply the MISSED_INSTALLMENT penalty
                eventPublisher.publishEvent(new LoanInstallmentOverdueEvent(
                        item.getLoanApplication().getId(),
                        item.getId(),
                        shortfall,
                        item.getDueDate()
                ));

                log.info("Marked schedule item {} as OVERDUE. Shortfall: {}", item.getId(), shortfall);
            } else {
                // Saftey check: It was somehow fully paid but the status didn't update
                item.setStatus(LoanScheduleStatus.PAID);
                scheduleItemRepository.save(item);
            }
        }
    }

    /**
     * ⏱️ TIME TRAVEL SUPPORT: Advance pending installments at a specific virtual date
     * Used by TimeTravelerService to simulate loan progression without changing system clock
     *
     * @param virtualDate the virtual date to use instead of LocalDate.now()
     */
    @Transactional
    public void advancePendingInstallmentsAtDate(LocalDate virtualDate) {
        log.debug("⏱️  Advancing schedule items at virtual date: {}", virtualDate);
        // Move to DUE if due date is within the active week (7 days) of virtual date
        List<LoanScheduleItem> pendingToDue = scheduleItemRepository.findByStatusAndDueDateLessThanEqual(
                LoanScheduleStatus.PENDING, virtualDate.plusDays(7));

        for (LoanScheduleItem item : pendingToDue) {
            item.setStatus(LoanScheduleStatus.DUE);
            scheduleItemRepository.save(item);
            log.debug("⏱️  Advanced schedule item {} to DUE (virtual: {})", item.getId(), virtualDate);
        }
    }

    /**
     * ⏱️ TIME TRAVEL SUPPORT: Process past-due installments at a specific virtual date
     * Used by TimeTravelerService for time-traveling loan testing
     *
     * @param virtualDate the virtual date to use for overdue calculations
     */
    @Transactional
    public void processPastDueInstallmentsAtDate(LocalDate virtualDate) {
        log.debug("⏱️  Processing past-due items at virtual date: {}", virtualDate);
        // Find everything strictly before virtualDate that is still marked PENDING or DUE
        List<LoanScheduleItem> pastDueItems = scheduleItemRepository.findByDueDateBeforeAndStatusIn(
                virtualDate,
                List.of(LoanScheduleStatus.PENDING, LoanScheduleStatus.DUE)
        );

        for (LoanScheduleItem item : pastDueItems) {
            BigDecimal totalPaid = item.getPrincipalPaid().add(item.getInterestPaid());
            BigDecimal shortfall = item.getTotalDue().subtract(totalPaid);

            if (shortfall.compareTo(BigDecimal.ZERO) > 0) {
                // Member did not fully pay this installment!
                item.setStatus(LoanScheduleStatus.OVERDUE);
                scheduleItemRepository.save(item);

                // Trigger penalty event
                eventPublisher.publishEvent(new LoanInstallmentOverdueEvent(
                        item.getLoanApplication().getId(),
                        item.getId(),
                        shortfall,
                        item.getDueDate()
                ));

                log.info("⏱️  Marked schedule item {} as OVERDUE (virtual: {}). Shortfall: {}", 
                        item.getId(), virtualDate, shortfall);
            } else {
                // Safety check: It was somehow fully paid but status didn't update
                item.setStatus(LoanScheduleStatus.PAID);
                scheduleItemRepository.save(item);
            }
        }
    }
}