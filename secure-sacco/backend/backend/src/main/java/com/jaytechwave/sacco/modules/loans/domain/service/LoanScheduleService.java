package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanScheduleItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanScheduleService {

    private final LoanScheduleItemRepository scheduleItemRepository;

    @Transactional
    public void generateWeeklySchedule(LoanApplication application) {
        int termWeeks = application.getLoanProduct().getTermWeeks();
        int gracePeriod = application.getLoanProduct().getGracePeriodDays();

        // Schedule starts ticking after grace period
        LocalDate scheduleStartDate = application.getDisbursedAt().toLocalDate().plusDays(gracePeriod);

        BigDecimal principal = application.getPrincipalAmount();

        // Total Interest = Principal * (Rate / 100)
        BigDecimal interestRate = application.getLoanProduct().getInterestRate().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal totalInterest = principal.multiply(interestRate).setScale(2, RoundingMode.HALF_UP);

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
                    .status(LoanScheduleStatus.PENDING)
                    .build();

            scheduleItemRepository.save(item);

            principalAccumulated = principalAccumulated.add(currentPrincipal);
            interestAccumulated = interestAccumulated.add(currentInterest);
        }

        log.info("Generated {} weekly schedule items for Loan Application {}", termWeeks, application.getId());
    }
}