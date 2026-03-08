package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.loans.domain.entity.*;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanScheduleItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LoanScheduleService")
class LoanScheduleServiceTest {

    @Mock
    private LoanScheduleItemRepository scheduleItemRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private LoanScheduleService service;

    private LoanProduct product;
    private LoanApplication application;

    @BeforeEach
    void setUp() {
        product = LoanProduct.builder()
                .id(UUID.randomUUID())
                .name("Standard Weekly Loan")
                .termWeeks(4)
                .interestRate(new BigDecimal("10.00"))  // 10% flat
                .applicationFee(new BigDecimal("200.00"))
                .gracePeriodDays(0)
                .isActive(true)
                .build();

        application = LoanApplication.builder()
                .id(UUID.randomUUID())
                .memberId(UUID.randomUUID())
                .loanProduct(product)
                .principalAmount(new BigDecimal("10000.00"))
                .applicationFee(new BigDecimal("200.00"))
                .applicationFeePaid(true)
                .status(LoanStatus.ACTIVE)
                .disbursedAt(LocalDateTime.of(2026, 1, 6, 0, 0))  // Tuesday
                .build();
    }

    // ─── Schedule generation ───────────────────────────────────────────

    @Test
    @DisplayName("generates the correct number of schedule items")
    void generateWeeklySchedule_createsCorrectItemCount() {
        service.generateWeeklySchedule(application);

        // 4-week term → 4 saves
        verify(scheduleItemRepository, times(4)).save(any(LoanScheduleItem.class));
    }

    @Test
    @DisplayName("first installment due 1 week from disbursal (no grace period)")
    void generateWeeklySchedule_firstDueDateIsOneWeekFromDisbursal() {
        ArgumentCaptor<LoanScheduleItem> captor = ArgumentCaptor.forClass(LoanScheduleItem.class);
        service.generateWeeklySchedule(application);
        verify(scheduleItemRepository, times(4)).save(captor.capture());

        LoanScheduleItem first = captor.getAllValues().get(0);
        // Disbursed 2026-01-06 + 0 grace days → schedule start = 2026-01-06, first due = +7 days
        assertThat(first.getDueDate()).isEqualTo(LocalDate.of(2026, 1, 13));
    }

    @Test
    @DisplayName("grace period pushes schedule start date forward")
    void generateWeeklySchedule_respectsGracePeriod() {
        product.setGracePeriodDays(14);
        ArgumentCaptor<LoanScheduleItem> captor = ArgumentCaptor.forClass(LoanScheduleItem.class);
        service.generateWeeklySchedule(application);
        verify(scheduleItemRepository, times(4)).save(captor.capture());

        LoanScheduleItem first = captor.getAllValues().get(0);
        // Schedule starts 2026-01-06 + 14 days = 2026-01-20; first due = +7 days = 2026-01-27
        assertThat(first.getDueDate()).isEqualTo(LocalDate.of(2026, 1, 27));
    }

    @Test
    @DisplayName("total principal across all weeks sums to loan principal")
    void generateWeeklySchedule_totalPrincipalMatchesLoanAmount() {
        ArgumentCaptor<LoanScheduleItem> captor = ArgumentCaptor.forClass(LoanScheduleItem.class);
        service.generateWeeklySchedule(application);
        verify(scheduleItemRepository, times(4)).save(captor.capture());

        BigDecimal totalPrincipal = captor.getAllValues().stream()
                .map(LoanScheduleItem::getPrincipalDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalPrincipal).isEqualByComparingTo(application.getPrincipalAmount());
    }

    @Test
    @DisplayName("total interest across all weeks sums to principal × rate")
    void generateWeeklySchedule_totalInterestMatchesExpected() {
        ArgumentCaptor<LoanScheduleItem> captor = ArgumentCaptor.forClass(LoanScheduleItem.class);
        service.generateWeeklySchedule(application);
        verify(scheduleItemRepository, times(4)).save(captor.capture());

        BigDecimal totalInterest = captor.getAllValues().stream()
                .map(LoanScheduleItem::getInterestDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 10% of 10,000 = 1,000
        assertThat(totalInterest).isEqualByComparingTo(new BigDecimal("1000.00"));
    }

    @Test
    @DisplayName("each item totalDue equals principalDue + interestDue")
    void generateWeeklySchedule_totalDueIsSum() {
        ArgumentCaptor<LoanScheduleItem> captor = ArgumentCaptor.forClass(LoanScheduleItem.class);
        service.generateWeeklySchedule(application);
        verify(scheduleItemRepository, times(4)).save(captor.capture());

        captor.getAllValues().forEach(item ->
                assertThat(item.getTotalDue())
                        .isEqualByComparingTo(item.getPrincipalDue().add(item.getInterestDue()))
        );
    }

    @Test
    @DisplayName("first item is DUE, rest are PENDING")
    void generateWeeklySchedule_firstItemIsDueRestArePending() {
        ArgumentCaptor<LoanScheduleItem> captor = ArgumentCaptor.forClass(LoanScheduleItem.class);
        service.generateWeeklySchedule(application);
        verify(scheduleItemRepository, times(4)).save(captor.capture());

        List<LoanScheduleItem> items = captor.getAllValues();
        assertThat(items.get(0).getStatus()).isEqualTo(LoanScheduleStatus.DUE);
        assertThat(items.get(1).getStatus()).isEqualTo(LoanScheduleStatus.PENDING);
        assertThat(items.get(2).getStatus()).isEqualTo(LoanScheduleStatus.PENDING);
        assertThat(items.get(3).getStatus()).isEqualTo(LoanScheduleStatus.PENDING);
    }

    @Test
    @DisplayName("weekly numbers are sequential starting at 1")
    void generateWeeklySchedule_weekNumbersAreSequential() {
        ArgumentCaptor<LoanScheduleItem> captor = ArgumentCaptor.forClass(LoanScheduleItem.class);
        service.generateWeeklySchedule(application);
        verify(scheduleItemRepository, times(4)).save(captor.capture());

        List<LoanScheduleItem> items = captor.getAllValues();
        for (int i = 0; i < items.size(); i++) {
            assertThat(items.get(i).getWeekNumber()).isEqualTo(i + 1);
        }
    }

    @Test
    @DisplayName("initial principalPaid and interestPaid are zero")
    void generateWeeklySchedule_initialPaidAmountsAreZero() {
        ArgumentCaptor<LoanScheduleItem> captor = ArgumentCaptor.forClass(LoanScheduleItem.class);
        service.generateWeeklySchedule(application);
        verify(scheduleItemRepository, times(4)).save(captor.capture());

        captor.getAllValues().forEach(item -> {
            assertThat(item.getPrincipalPaid()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(item.getInterestPaid()).isEqualByComparingTo(BigDecimal.ZERO);
        });
    }

    // ─── Odd-term rounding ───────────────────────────────────────────

    @Test
    @DisplayName("final week absorbs rounding remainder — principal still sums exactly")
    void generateWeeklySchedule_oddTermPrincipalRoundingIsExact() {
        // KES 10,000 over 3 weeks: 3,333.33 + 3,333.33 + 3,333.34
        product.setTermWeeks(3);
        ArgumentCaptor<LoanScheduleItem> captor = ArgumentCaptor.forClass(LoanScheduleItem.class);
        service.generateWeeklySchedule(application);
        verify(scheduleItemRepository, times(3)).save(captor.capture());

        BigDecimal total = captor.getAllValues().stream()
                .map(LoanScheduleItem::getPrincipalDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(total).isEqualByComparingTo(new BigDecimal("10000.00"));
    }
}