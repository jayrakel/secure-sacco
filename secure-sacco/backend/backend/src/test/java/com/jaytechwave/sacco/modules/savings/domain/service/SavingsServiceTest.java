package com.jaytechwave.sacco.modules.savings.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.savings.api.dto.SavingsDTOs.*;
import com.jaytechwave.sacco.modules.savings.domain.entity.*;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SavingsService")
class SavingsServiceTest {

    @Mock SavingsAccountRepository savingsAccountRepository;
    @Mock SavingsTransactionRepository savingsTransactionRepository;
    @Mock MemberRepository memberRepository;
    @Mock JournalEntryService journalEntryService;
    @Mock PaymentService paymentService;
    @Mock UserRepository userRepository;
    @Mock SecurityAuditService securityAuditService;

    @InjectMocks
    private SavingsService service;

    private UUID memberId;
    private Member activeMember;
    private SavingsAccount activeAccount;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();

        activeMember = Member.builder()
                .id(memberId)
                .memberNumber("MEM-001")
                .firstName("John").lastName("Doe")
                .status(MemberStatus.ACTIVE)
                .isDeleted(false)
                .build();

        activeAccount = SavingsAccount.builder()
                .id(UUID.randomUUID())
                .memberId(memberId)
                .status(SavingsAccountStatus.ACTIVE)
                .build();
    }

    // ─── processManualDeposit ─────────────────────────────────────────

    @Test
    @DisplayName("deposit on active account posts transaction and GL entry")
    void processManualDeposit_activeAccount_succeeds() {
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.of(activeAccount));
        when(savingsTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ManualDepositRequest req = new ManualDepositRequest(memberId, new BigDecimal("5000.00"), "Cash deposit");
        SavingsTransactionResponse result = service.processManualDeposit(req);

        ArgumentCaptor<SavingsTransaction> txCaptor = ArgumentCaptor.forClass(SavingsTransaction.class);
        verify(savingsTransactionRepository).save(txCaptor.capture());

        SavingsTransaction saved = txCaptor.getValue();
        assertThat(saved.getAmount()).isEqualByComparingTo(new BigDecimal("5000.00"));
        assertThat(saved.getType()).isEqualTo(TransactionType.DEPOSIT);
        assertThat(saved.getChannel()).isEqualTo(TransactionChannel.CASH);
        assertThat(saved.getStatus()).isEqualTo(TransactionStatus.POSTED);

        verify(journalEntryService).postSavingsTransaction(
                eq(memberId), eq(new BigDecimal("5000.00")), eq("DEPOSIT"), eq("CASH"), anyString()
        );
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("deposit auto-creates savings account when none exists")
    void processManualDeposit_noExistingAccount_autoCreates() {
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.empty());
        when(savingsAccountRepository.save(any(SavingsAccount.class))).thenReturn(activeAccount);
        when(savingsTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.processManualDeposit(new ManualDepositRequest(memberId, new BigDecimal("1000.00"), null));

        verify(savingsAccountRepository, atLeastOnce()).save(any(SavingsAccount.class));
    }

    @Test
    @DisplayName("deposit on FROZEN account throws")
    void processManualDeposit_frozenAccount_throws() {
        activeAccount.setStatus(SavingsAccountStatus.FROZEN);
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.of(activeAccount));

        assertThatThrownBy(() ->
                service.processManualDeposit(new ManualDepositRequest(memberId, new BigDecimal("1000.00"), null))
        ).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("frozen");

        verify(savingsTransactionRepository, never()).save(any());
        verify(journalEntryService, never()).postSavingsTransaction(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("deposit on INACTIVE member throws")
    void processManualDeposit_inactiveMember_throws() {
        activeMember.setStatus(MemberStatus.SUSPENDED);
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));

        assertThatThrownBy(() ->
                service.processManualDeposit(new ManualDepositRequest(memberId, new BigDecimal("1000.00"), null))
        ).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ACTIVE");
    }

    @Test
    @DisplayName("deposit reference uses provided value when given")
    void processManualDeposit_usesProvidedReference() {
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.of(activeAccount));
        when(savingsTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.processManualDeposit(new ManualDepositRequest(memberId, new BigDecimal("100.00"), "RECEIPT-XYZ"));

        ArgumentCaptor<SavingsTransaction> captor = ArgumentCaptor.forClass(SavingsTransaction.class);
        verify(savingsTransactionRepository).save(captor.capture());
        assertThat(captor.getValue().getReference()).isEqualTo("RECEIPT-XYZ");
    }

    // ─── processManualWithdrawal ──────────────────────────────────────

    @Test
    @DisplayName("withdrawal within available balance succeeds")
    void processManualWithdrawal_sufficientBalance_succeeds() {
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.of(activeAccount));
        when(savingsTransactionRepository.calculateBalance(activeAccount.getId()))
                .thenReturn(new BigDecimal("10000.00"));
        when(savingsTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.processManualWithdrawal(new ManualWithdrawalRequest(memberId, new BigDecimal("3000.00"), "WDL-001"));

        ArgumentCaptor<SavingsTransaction> captor = ArgumentCaptor.forClass(SavingsTransaction.class);
        verify(savingsTransactionRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(TransactionType.WITHDRAWAL);
        assertThat(captor.getValue().getAmount()).isEqualByComparingTo(new BigDecimal("3000.00"));
    }

    @Test
    @DisplayName("withdrawal exceeding balance throws InsufficientFunds")
    void processManualWithdrawal_insufficientBalance_throws() {
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.of(activeAccount));
        when(savingsTransactionRepository.calculateBalance(activeAccount.getId()))
                .thenReturn(new BigDecimal("500.00"));

        assertThatThrownBy(() ->
                service.processManualWithdrawal(new ManualWithdrawalRequest(memberId, new BigDecimal("1000.00"), null))
        ).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Insufficient");

        verify(savingsTransactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("withdrawal posts GL entry")
    void processManualWithdrawal_postsGLEntry() {
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.of(activeAccount));
        when(savingsTransactionRepository.calculateBalance(activeAccount.getId()))
                .thenReturn(new BigDecimal("5000.00"));
        when(savingsTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.processManualWithdrawal(new ManualWithdrawalRequest(memberId, new BigDecimal("2000.00"), null));

        verify(journalEntryService).postSavingsTransaction(
                eq(memberId), eq(new BigDecimal("2000.00")), eq("WITHDRAWAL"), eq("CASH"), anyString()
        );
    }

    @Test
    @DisplayName("withdrawal from FROZEN account throws")
    void processManualWithdrawal_frozenAccount_throws() {
        activeAccount.setStatus(SavingsAccountStatus.FROZEN);
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(activeMember));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.of(activeAccount));

        assertThatThrownBy(() ->
                service.processManualWithdrawal(new ManualWithdrawalRequest(memberId, new BigDecimal("100.00"), null))
        ).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("frozen");
    }

    // ─── getMyBalance ─────────────────────────────────────────────────

    @Test
    @DisplayName("getMyBalance returns correct balance for member with account")
    void getMyBalance_memberWithAccount_returnsBalance() {
        var user = com.jaytechwave.sacco.modules.users.domain.entity.User.builder()
                .id(UUID.randomUUID()).email("john@sacco.com")
                .passwordHash("hash").isDeleted(false)
                .status(com.jaytechwave.sacco.modules.users.domain.entity.UserStatus.ACTIVE)
                .member(activeMember).build();

        when(userRepository.findByEmail("john@sacco.com")).thenReturn(Optional.of(user));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.of(activeAccount));
        when(savingsTransactionRepository.calculateBalance(activeAccount.getId()))
                .thenReturn(new BigDecimal("7500.00"));

        SavingsBalanceResponse result = service.getMyBalance("john@sacco.com");

        assertThat(result.balance()).isEqualByComparingTo(new BigDecimal("7500.00"));
        assertThat(result.status()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("getMyBalance returns zero for member with no account")
    void getMyBalance_noAccount_returnsZero() {
        var user = com.jaytechwave.sacco.modules.users.domain.entity.User.builder()
                .id(UUID.randomUUID()).email("new@sacco.com")
                .passwordHash("hash").isDeleted(false)
                .status(com.jaytechwave.sacco.modules.users.domain.entity.UserStatus.ACTIVE)
                .member(activeMember).build();

        when(userRepository.findByEmail("new@sacco.com")).thenReturn(Optional.of(user));
        when(savingsAccountRepository.findByMemberId(memberId)).thenReturn(Optional.empty());

        SavingsBalanceResponse result = service.getMyBalance("new@sacco.com");

        assertThat(result.balance()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}