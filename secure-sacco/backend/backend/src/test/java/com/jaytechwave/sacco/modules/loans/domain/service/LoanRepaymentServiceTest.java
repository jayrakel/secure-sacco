package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.loans.domain.entity.*;
import com.jaytechwave.sacco.modules.loans.domain.repository.*;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LoanRepaymentService — Waterfall Allocation Engine")
class LoanRepaymentServiceTest {

    @Mock LoanRepaymentRepository loanRepaymentRepository;
    @Mock LoanApplicationRepository loanApplicationRepository;
    @Mock LoanScheduleItemRepository scheduleItemRepository;
    @Mock PaymentService paymentService;
    @Mock UserRepository userRepository;
    @Mock JournalEntryService journalEntryService;
    @Mock SecurityAuditService securityAuditService;
    @Mock MemberRepository memberRepository;

    @InjectMocks
    private LoanRepaymentService service;

    private LoanApplication application;
    private LoanScheduleItem week1;
    private LoanScheduleItem week2;

    @BeforeEach
    void setUp() {
        LoanProduct product = LoanProduct.builder()
                .id(UUID.randomUUID())
                .name("Test Product")
                .termWeeks(2)
                .interestRate(new BigDecimal("10.00"))
                .applicationFee(BigDecimal.ZERO)
                .gracePeriodDays(0)
                .isActive(true)
                .build();

        UUID memberId = UUID.randomUUID();

        application = LoanApplication.builder()
                .id(UUID.randomUUID())
                .memberId(memberId)
                .loanProduct(product)
                .principalAmount(new BigDecimal("10000.00"))
                .applicationFee(BigDecimal.ZERO)
                .applicationFeePaid(true)
                .status(LoanStatus.ACTIVE)
                .prepaymentBalance(BigDecimal.ZERO)
                .build();

        // Week 1: 5000 principal + 500 interest = 5500 total, all DUE
        week1 = LoanScheduleItem.builder()
                .id(UUID.randomUUID())
                .loanApplication(application)
                .weekNumber(1)
                .principalDue(new BigDecimal("5000.00"))
                .interestDue(new BigDecimal("500.00"))
                .totalDue(new BigDecimal("5500.00"))
                .principalPaid(BigDecimal.ZERO)
                .interestPaid(BigDecimal.ZERO)
                .status(LoanScheduleStatus.DUE)
                .build();

        // Week 2: 5000 principal + 500 interest = 5500 total, OVERDUE
        week2 = LoanScheduleItem.builder()
                .id(UUID.randomUUID())
                .loanApplication(application)
                .weekNumber(2)
                .principalDue(new BigDecimal("5000.00"))
                .interestDue(new BigDecimal("500.00"))
                .totalDue(new BigDecimal("5500.00"))
                .principalPaid(BigDecimal.ZERO)
                .interestPaid(BigDecimal.ZERO)
                .status(LoanScheduleStatus.OVERDUE)
                .build();

        // 🚨 FIX: Mock the Member so Audit Logs can fetch the member number
        Member mockMember = new Member();
        mockMember.setId(memberId);
        mockMember.setMemberNumber("M-TEST-001");

        Mockito.lenient().when(memberRepository.findById(ArgumentMatchers.any()))
                .thenReturn(Optional.of(mockMember));
    }

    private void stubSchedule(LoanScheduleItem... items) {
        when(scheduleItemRepository.findByLoanApplicationIdOrderByWeekNumberAsc(application.getId()))
                .thenReturn(Arrays.asList(items));
    }

    // ─── Interest-first (Pass 1 before Pass 2) ────────────────────────

    @Test
    @DisplayName("pays all interest before any principal — interest-first rule")
    void waterfall_paysInterestBeforePrincipal() {
        stubSchedule(week1);
        // Load just enough to pay interest but not full instalment
        application.setPrepaymentBalance(new BigDecimal("500.00"));

        BigDecimal[] result = service.executeWaterfallAllocation(application);

        assertThat(result[0]).isEqualByComparingTo(new BigDecimal("500.00")); // interestPaid
        assertThat(result[1]).isEqualByComparingTo(BigDecimal.ZERO);          // principalPaid
        assertThat(week1.getInterestPaid()).isEqualByComparingTo(new BigDecimal("500.00"));
        assertThat(week1.getPrincipalPaid()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("pays principal only after interest is fully satisfied")
    void waterfall_paysPrincipalAfterInterest() {
        stubSchedule(week1);
        application.setPrepaymentBalance(new BigDecimal("700.00"));

        BigDecimal[] result = service.executeWaterfallAllocation(application);

        assertThat(result[0]).isEqualByComparingTo(new BigDecimal("500.00")); // all interest
        assertThat(result[1]).isEqualByComparingTo(new BigDecimal("200.00")); // remainder → principal
    }

    @Test
    @DisplayName("full payment marks item as PAID")
    void waterfall_fullPaymentMarksItemPaid() {
        stubSchedule(week1);
        application.setPrepaymentBalance(new BigDecimal("5500.00"));

        service.executeWaterfallAllocation(application);

        assertThat(week1.getStatus()).isEqualTo(LoanScheduleStatus.PAID);
    }

    @Test
    @DisplayName("partial payment does not change item status")
    void waterfall_partialPaymentKeepsItemStatus() {
        stubSchedule(week1);
        application.setPrepaymentBalance(new BigDecimal("1000.00"));

        service.executeWaterfallAllocation(application);

        assertThat(week1.getStatus()).isEqualTo(LoanScheduleStatus.DUE);
    }

    @Test
    @DisplayName("oldest item is paid first (week1 before week2)")
    void waterfall_paysOldestItemFirst() {
        stubSchedule(week1, week2);
        // Enough to pay week1 in full
        application.setPrepaymentBalance(new BigDecimal("5500.00"));

        service.executeWaterfallAllocation(application);

        // week1 should be fully paid
        assertThat(week1.getStatus()).isEqualTo(LoanScheduleStatus.PAID);
        // week2 should still have outstanding balance
        assertThat(week2.getPrincipalPaid()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(week2.getInterestPaid()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("excess credit stays in prepayment balance after full payoff")
    void waterfall_excessCreditRemainsInPrepaymentBalance() {
        stubSchedule(week1);
        // Pay 6000 for a 5500 item → 500 excess
        application.setPrepaymentBalance(new BigDecimal("6000.00"));

        service.executeWaterfallAllocation(application);

        assertThat(application.getPrepaymentBalance()).isEqualByComparingTo(new BigDecimal("500.00"));
    }

    @Test
    @DisplayName("all items paid → loan status changes to CLOSED")
    void waterfall_allPaidLoanClosed() {
        stubSchedule(week1, week2);
        application.setPrepaymentBalance(new BigDecimal("11000.00")); // enough for both

        service.executeWaterfallAllocation(application);

        assertThat(application.getStatus()).isEqualTo(LoanStatus.CLOSED);
    }

    @Test
    @DisplayName("zero credit does nothing")
    void waterfall_zeroCreditDoesNothing() {
        stubSchedule(week1);
        application.setPrepaymentBalance(BigDecimal.ZERO);

        BigDecimal[] result = service.executeWaterfallAllocation(application);

        assertThat(result[0]).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result[1]).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(week1.getStatus()).isEqualTo(LoanScheduleStatus.DUE);
    }

    // ─── processCompletedRepayment ─────────────────────────────────────

    @Test
    @DisplayName("processCompletedRepayment is idempotent — second call is a no-op")
    void processCompletedRepayment_idempotent() {
        LoanRepayment repayment = LoanRepayment.builder()
                .id(UUID.randomUUID())
                .loanApplication(application)
                .amount(new BigDecimal("5500.00"))
                .status(LoanRepaymentStatus.COMPLETED) // already done
                .build();

        when(loanRepaymentRepository.findById(repayment.getId()))
                .thenReturn(Optional.of(repayment));

        service.processCompletedRepayment(repayment.getId(), "RECEIPT-001");

        // No allocation, no save
        verify(scheduleItemRepository, never()).findByLoanApplicationIdOrderByWeekNumberAsc(any());
        verify(journalEntryService, never()).postLoanRepayment(any(), any(), any(), any());
    }
}