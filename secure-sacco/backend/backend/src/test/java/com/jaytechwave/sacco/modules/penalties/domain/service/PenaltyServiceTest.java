package com.jaytechwave.sacco.modules.penalties.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanProduct;
import com.jaytechwave.sacco.modules.loans.domain.event.LoanInstallmentOverdueEvent;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.WaivePenaltyRequest;
import com.jaytechwave.sacco.modules.penalties.domain.entity.*;
import com.jaytechwave.sacco.modules.penalties.domain.repository.*;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PenaltyService")
class PenaltyServiceTest {

    @Mock PenaltyRepository penaltyRepository;
    @Mock PenaltyAccrualRepository penaltyAccrualRepository;
    @Mock PenaltyRuleRepository penaltyRuleRepository;
    @Mock LoanApplicationRepository loanApplicationRepository;
    @Mock JournalEntryService journalEntryService;
    @Mock UserRepository userRepository;
    @Mock SecurityAuditService securityAuditService;

    @InjectMocks
    private PenaltyService service;

    private UUID memberId;
    private UUID loanAppId;
    private UUID scheduleItemId;
    private LoanApplication loanApp;
    private PenaltyRule fixedRule;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();
        loanAppId = UUID.randomUUID();
        scheduleItemId = UUID.randomUUID();

        LoanProduct product = LoanProduct.builder()
                .id(UUID.randomUUID()).name("P").termWeeks(4)
                .interestRate(BigDecimal.TEN).applicationFee(BigDecimal.ZERO)
                .gracePeriodDays(0).isActive(true).build();

        loanApp = LoanApplication.builder()
                .id(loanAppId).memberId(memberId).loanProduct(product)
                .principalAmount(new BigDecimal("10000.00"))
                .applicationFee(BigDecimal.ZERO).applicationFeePaid(true)
                .build();

        fixedRule = PenaltyRule.builder()
                .id(UUID.randomUUID())
                .code("LOAN_MISSED_INSTALLMENT")
                .name("Missed Installment")
                .baseAmountType(AmountType.FIXED)
                .baseAmountValue(new BigDecimal("500.00"))
                .gracePeriodDays(0)
                .interestPeriodDays(30)
                .interestRate(BigDecimal.ZERO)
                .interestMode(InterestMode.NONE)
                .isActive(true)
                .build();
    }

    // ─── applyMissedInstallmentPenalty ────────────────────────────────

    @Test
    @DisplayName("creates penalty and GL entry for a missed installment")
    void applyMissedInstallmentPenalty_createsPenaltyAndPostsGL() {
        when(penaltyAccrualRepository.existsByIdempotencyKey(anyString())).thenReturn(false);
        when(penaltyRuleRepository.findByCode("LOAN_MISSED_INSTALLMENT")).thenReturn(Optional.of(fixedRule));
        when(loanApplicationRepository.findById(loanAppId)).thenReturn(Optional.of(loanApp));
        when(penaltyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LoanInstallmentOverdueEvent event = new LoanInstallmentOverdueEvent(
                loanAppId, scheduleItemId, new BigDecimal("500.00"), java.time.LocalDate.now()
        );

        service.applyMissedInstallmentPenalty(event);

        ArgumentCaptor<Penalty> captor = ArgumentCaptor.forClass(Penalty.class);
        verify(penaltyRepository).save(captor.capture());
        Penalty created = captor.getValue();

        assertThat(created.getOriginalAmount()).isEqualByComparingTo(new BigDecimal("500.00"));
        assertThat(created.getOutstandingAmount()).isEqualByComparingTo(new BigDecimal("500.00"));
        assertThat(created.getStatus()).isEqualTo(PenaltyStatus.OPEN);
        assertThat(created.getMemberId()).isEqualTo(memberId);

        verify(journalEntryService).postPenaltyCreation(eq(memberId), eq(new BigDecimal("500.00")), anyString());
    }

    @Test
    @DisplayName("percentage-based penalty computes correct amount from shortfall")
    void applyMissedInstallmentPenalty_percentageBased_computesCorrectAmount() {
        PenaltyRule percentRule = PenaltyRule.builder()
                .id(UUID.randomUUID())
                .code("LOAN_MISSED_INSTALLMENT")
                .name("Percentage Missed")
                .baseAmountType(AmountType.PERCENTAGE)
                .baseAmountValue(new BigDecimal("5.00"))  // 5%
                .gracePeriodDays(0).interestPeriodDays(30)
                .interestRate(BigDecimal.ZERO).interestMode(InterestMode.NONE)
                .isActive(true).build();

        when(penaltyAccrualRepository.existsByIdempotencyKey(anyString())).thenReturn(false);
        when(penaltyRuleRepository.findByCode("LOAN_MISSED_INSTALLMENT")).thenReturn(Optional.of(percentRule));
        when(loanApplicationRepository.findById(loanAppId)).thenReturn(Optional.of(loanApp));
        when(penaltyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Shortfall of 2000 → penalty = 5% of 2000 = 100
        LoanInstallmentOverdueEvent event = new LoanInstallmentOverdueEvent(
                loanAppId, scheduleItemId, new BigDecimal("2000.00"), java.time.LocalDate.now()
        );

        service.applyMissedInstallmentPenalty(event);

        ArgumentCaptor<Penalty> captor = ArgumentCaptor.forClass(Penalty.class);
        verify(penaltyRepository).save(captor.capture());
        assertThat(captor.getValue().getOriginalAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
    }

    @Test
    @DisplayName("idempotency: second event for same schedule item is ignored")
    void applyMissedInstallmentPenalty_idempotent_secondCallIgnored() {
        String idempotencyKey = "MISS-" + scheduleItemId;
        when(penaltyAccrualRepository.existsByIdempotencyKey(idempotencyKey)).thenReturn(true);

        LoanInstallmentOverdueEvent event = new LoanInstallmentOverdueEvent(
                loanAppId, scheduleItemId, new BigDecimal("500.00"), java.time.LocalDate.now()
        );

        service.applyMissedInstallmentPenalty(event);

        verify(penaltyRepository, never()).save(any());
        verify(journalEntryService, never()).postPenaltyCreation(any(), any(), any());
    }

    @Test
    @DisplayName("inactive rule results in no penalty creation")
    void applyMissedInstallmentPenalty_inactiveRule_noPenalty() {
        fixedRule.setIsActive(false);
        when(penaltyAccrualRepository.existsByIdempotencyKey(anyString())).thenReturn(false);
        when(penaltyRuleRepository.findByCode("LOAN_MISSED_INSTALLMENT")).thenReturn(Optional.of(fixedRule));

        LoanInstallmentOverdueEvent event = new LoanInstallmentOverdueEvent(
                loanAppId, scheduleItemId, new BigDecimal("500.00"), java.time.LocalDate.now()
        );

        service.applyMissedInstallmentPenalty(event);

        verify(penaltyRepository, never()).save(any());
    }

    // ─── waivePenalty ─────────────────────────────────────────────────

    @Test
    @DisplayName("waive reduces outstanding amount and posts GL reversal")
    void waivePenalty_reducesOutstandingAndPostsGL() {
        UUID penaltyId = UUID.randomUUID();
        Penalty penalty = Penalty.builder()
                .id(penaltyId).memberId(memberId)
                .penaltyRule(fixedRule)
                .originalAmount(new BigDecimal("500.00"))
                .outstandingAmount(new BigDecimal("500.00"))
                .amountWaived(BigDecimal.ZERO)
                .principalPaid(BigDecimal.ZERO).interestPaid(BigDecimal.ZERO)
                .status(PenaltyStatus.OPEN)
                .build();

        User treasurer = User.builder()
                .id(UUID.randomUUID()).email("treasurer@sacco.com")
                .firstName("T").lastName("User").status(UserStatus.ACTIVE)
                .passwordHash("hash").isDeleted(false).build();

        when(penaltyRepository.findById(penaltyId)).thenReturn(Optional.of(penalty));
        when(userRepository.findByEmail("treasurer@sacco.com")).thenReturn(Optional.of(treasurer));
        when(penaltyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WaivePenaltyRequest req = new WaivePenaltyRequest(new BigDecimal("200.00"), "Hardship");
        service.waivePenalty(penaltyId, req, "treasurer@sacco.com", "127.0.0.1");

        assertThat(penalty.getOutstandingAmount()).isEqualByComparingTo(new BigDecimal("300.00"));
        assertThat(penalty.getAmountWaived()).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(penalty.getStatus()).isEqualTo(PenaltyStatus.OPEN); // not fully waived

        verify(journalEntryService).postPenaltyWaiver(eq(memberId), eq(new BigDecimal("200.00")), anyString());
    }

    @Test
    @DisplayName("full waiver changes status to WAIVED")
    void waivePenalty_fullWaiver_statusBecomesWaived() {
        UUID penaltyId = UUID.randomUUID();
        Penalty penalty = Penalty.builder()
                .id(penaltyId).memberId(memberId).penaltyRule(fixedRule)
                .originalAmount(new BigDecimal("500.00"))
                .outstandingAmount(new BigDecimal("500.00"))
                .amountWaived(BigDecimal.ZERO)
                .principalPaid(BigDecimal.ZERO).interestPaid(BigDecimal.ZERO)
                .status(PenaltyStatus.OPEN).build();

        User treasurer = User.builder()
                .id(UUID.randomUUID()).email("treasurer@sacco.com")
                .firstName("T").lastName("User").status(UserStatus.ACTIVE)
                .passwordHash("hash").isDeleted(false).build();

        when(penaltyRepository.findById(penaltyId)).thenReturn(Optional.of(penalty));
        when(userRepository.findByEmail("treasurer@sacco.com")).thenReturn(Optional.of(treasurer));
        when(penaltyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.waivePenalty(penaltyId, new WaivePenaltyRequest(new BigDecimal("500.00"), "Full waiver"),
                "treasurer@sacco.com", "127.0.0.1");

        assertThat(penalty.getStatus()).isEqualTo(PenaltyStatus.WAIVED);
    }

    @Test
    @DisplayName("waiver exceeding outstanding amount is rejected")
    void waivePenalty_excessWaiver_throws() {
        UUID penaltyId = UUID.randomUUID();
        Penalty penalty = Penalty.builder()
                .id(penaltyId).memberId(memberId).penaltyRule(fixedRule)
                .originalAmount(new BigDecimal("500.00"))
                .outstandingAmount(new BigDecimal("200.00"))
                .amountWaived(BigDecimal.ZERO)
                .principalPaid(BigDecimal.ZERO).interestPaid(BigDecimal.ZERO)
                .status(PenaltyStatus.OPEN).build();

        User treasurer = User.builder()
                .id(UUID.randomUUID()).email("treasurer@sacco.com")
                .firstName("T").lastName("User").status(UserStatus.ACTIVE)
                .passwordHash("hash").isDeleted(false).build();

        when(penaltyRepository.findById(penaltyId)).thenReturn(Optional.of(penalty));
        when(userRepository.findByEmail("treasurer@sacco.com")).thenReturn(Optional.of(treasurer));

        assertThatThrownBy(() -> service.waivePenalty(penaltyId,
                new WaivePenaltyRequest(new BigDecimal("500.00"), "Too much"),
                "treasurer@sacco.com", "127.0.0.1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot exceed");
    }
}