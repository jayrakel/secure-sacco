package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.loans.domain.entity.*;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanScheduleItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LoanScheduleServiceTest {

    @Mock
    private LoanScheduleItemRepository scheduleItemRepository;

    @InjectMocks
    private LoanScheduleService loanScheduleService;

    private LoanApplication mockApp;
    private LoanProduct mockProduct;

    @BeforeEach
    void setUp() {
        mockProduct = new LoanProduct();
        mockProduct.setId(UUID.randomUUID());
        mockProduct.setInterestModel(InterestModel.FLAT);
        mockProduct.setInterestRate(new BigDecimal("10.00")); // 10%
        mockProduct.setTermWeeks(104);
        mockProduct.setGracePeriodDays(28);

        mockApp = new LoanApplication();
        mockApp.setId(UUID.randomUUID());
        mockApp.setLoanProduct(mockProduct);
        mockApp.setPrincipalAmount(new BigDecimal("50000.00"));
        // 🚨 THE FIX: Set termWeeks on the application itself
        mockApp.setTermWeeks(104);
        mockApp.setDisbursedAt(LocalDateTime.of(2024, 1, 1, 10, 0));
    }

    @Test
    void generateWeeklySchedule_createsCorrectNumberOfItems() {
        loanScheduleService.generateWeeklySchedule(mockApp);

        ArgumentCaptor<List<LoanScheduleItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(scheduleItemRepository).saveAll(captor.capture());

        List<LoanScheduleItem> items = captor.getValue();
        assertEquals(104, items.size());
    }

    @Test
    void generateWeeklySchedule_respectsGracePeriod() {
        loanScheduleService.generateWeeklySchedule(mockApp);

        ArgumentCaptor<List<LoanScheduleItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(scheduleItemRepository).saveAll(captor.capture());

        List<LoanScheduleItem> items = captor.getValue();
        LoanScheduleItem firstItem = items.get(0);

        // Disbursed Jan 1st. Grace period 28 days = Jan 29.
        // First payment should be due Jan 29 + 1 week = Feb 5.
        // (Assuming standard 7-day week schedule from the end of grace period)
        LocalDateTime expectedDueDate = mockApp.getDisbursedAt()
                .plusDays(mockProduct.getGracePeriodDays())
                .plusWeeks(1);

        assertEquals(expectedDueDate.toLocalDate(), firstItem.getDueDate());
    }

    @Test
    void generateWeeklySchedule_totalPrincipalMatchesLoanAmount() {
        loanScheduleService.generateWeeklySchedule(mockApp);

        ArgumentCaptor<List<LoanScheduleItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(scheduleItemRepository).saveAll(captor.capture());

        List<LoanScheduleItem> items = captor.getValue();
        BigDecimal totalPrincipal = items.stream()
                .map(LoanScheduleItem::getPrincipalDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertEquals(mockApp.getPrincipalAmount(), totalPrincipal);
    }

    @Test
    void generateWeeklySchedule_totalInterestMatchesExpected() {
        loanScheduleService.generateWeeklySchedule(mockApp);

        ArgumentCaptor<List<LoanScheduleItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(scheduleItemRepository).saveAll(captor.capture());

        List<LoanScheduleItem> items = captor.getValue();
        BigDecimal totalInterest = items.stream()
                .map(LoanScheduleItem::getInterestDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 50,000 * 10% * (104/52) years = 10,000
        BigDecimal expectedInterest = new BigDecimal("10000.00");
        assertEquals(expectedInterest, totalInterest);
    }

    @Test
    void generateWeeklySchedule_totalDueIsSum() {
        loanScheduleService.generateWeeklySchedule(mockApp);

        ArgumentCaptor<List<LoanScheduleItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(scheduleItemRepository).saveAll(captor.capture());

        List<LoanScheduleItem> items = captor.getValue();
        LoanScheduleItem firstItem = items.get(0);

        BigDecimal expectedTotal = firstItem.getPrincipalDue().add(firstItem.getInterestDue());
        assertEquals(expectedTotal, firstItem.getTotalDue());
    }

    @Test
    void generateWeeklySchedule_reducingBalanceModel() {
        mockProduct.setInterestModel(InterestModel.REDUCING_BALANCE);
        mockProduct.setInterestRate(new BigDecimal("12.00")); // 12% annual -> ~0.23% weekly

        loanScheduleService.generateWeeklySchedule(mockApp);

        ArgumentCaptor<List<LoanScheduleItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(scheduleItemRepository).saveAll(captor.capture());

        List<LoanScheduleItem> items = captor.getValue();

        // In reducing balance, first interest should be highest, last should be lowest
        BigDecimal firstInterest = items.get(0).getInterestDue();
        BigDecimal lastInterest = items.get(items.size() - 1).getInterestDue();

        assert(firstInterest.compareTo(lastInterest) > 0);
    }

    @Test
    void generateWeeklySchedule_weekNumbersAreSequential() {
        loanScheduleService.generateWeeklySchedule(mockApp);

        ArgumentCaptor<List<LoanScheduleItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(scheduleItemRepository).saveAll(captor.capture());

        List<LoanScheduleItem> items = captor.getValue();
        for (int i = 0; i < items.size(); i++) {
            assertEquals(i + 1, items.get(i).getWeekNumber());
        }
    }

    @Test
    void generateWeeklySchedule_handlesEmptyPrincipal() {
        mockApp.setPrincipalAmount(BigDecimal.ZERO);

        try {
            loanScheduleService.generateWeeklySchedule(mockApp);
        } catch (IllegalArgumentException e) {
            assertEquals("Principal amount must be greater than zero", e.getMessage());
        }
    }

    @Test
    void generateWeeklySchedule_handlesMissingDisbursementDate() {
        mockApp.setDisbursedAt(null);

        try {
            loanScheduleService.generateWeeklySchedule(mockApp);
        } catch (IllegalArgumentException e) {
            assertEquals("Loan must have a disbursement date to generate a schedule", e.getMessage());
        }
    }

    @Test
    void generateWeeklySchedule_oddTermPrincipalRoundingIsExact() {
        // Use an amount that doesn't divide cleanly by 104
        mockApp.setPrincipalAmount(new BigDecimal("50000.33"));

        loanScheduleService.generateWeeklySchedule(mockApp);

        ArgumentCaptor<List<LoanScheduleItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(scheduleItemRepository).saveAll(captor.capture());

        List<LoanScheduleItem> items = captor.getValue();
        BigDecimal totalPrincipal = items.stream()
                .map(LoanScheduleItem::getPrincipalDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // The total of all scheduled principal payments MUST exactly equal the initial principal,
        // regardless of how messy the division was.
        assertEquals(mockApp.getPrincipalAmount(), totalPrincipal);
    }
}