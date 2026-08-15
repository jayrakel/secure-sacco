package com.jaytechwave.sacco.modules.accounting.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.CreateJournalEntryRequest;
import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.JournalEntryLineRequest;
import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.JournalEntryResponse;
import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntry;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntryStatus;
import com.jaytechwave.sacco.modules.accounting.domain.repository.AccountRepository;
import com.jaytechwave.sacco.modules.accounting.domain.repository.JournalEntryRepository;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Adversarial Invariance and Boundary Stress Test Suite for JournalEntryService.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Adversarial Stress Testing — Double-Entry Accounting Invariants")
public class JournalEntryAdversarialStressTest {

    @Mock private JournalEntryRepository journalEntryRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private SecurityAuditService securityAuditService;

    @InjectMocks
    private JournalEntryService journalEntryService;

    private Account acc1000;
    private Account acc1001;
    private Account acc2100;
    private Account acc5360;

    @BeforeEach
    void setUp() {
        acc1000 = Account.builder().id(UUID.randomUUID()).accountCode("1000").accountName("Cash").isActive(true).build();
        acc1001 = Account.builder().id(UUID.randomUUID()).accountCode("1001").accountName("M-Pesa Clearing").isActive(true).build();
        acc2100 = Account.builder().id(UUID.randomUUID()).accountCode("2100").accountName("Savings Deposits").isActive(true).build();
        acc5360 = Account.builder().id(UUID.randomUUID()).accountCode("5360").accountName("Expense Reimbursement").isActive(true).build();

        lenient().when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(journalEntryRepository.existsByReferenceNumber(anyString())).thenReturn(false);
        lenient().when(accountRepository.findByAccountCode("1000")).thenReturn(Optional.of(acc1000));
        lenient().when(accountRepository.findByAccountCode("1001")).thenReturn(Optional.of(acc1001));
        lenient().when(accountRepository.findByAccountCode("2100")).thenReturn(Optional.of(acc2100));
        lenient().when(accountRepository.findByAccountCode("5360")).thenReturn(Optional.of(acc5360));
    }

    @Test
    @DisplayName("Invariance: Multi-line compound transaction (5 debits, 2 credits) balances exactly")
    void testCompoundMultiLineTransaction_balancesExactly() {
        Account acc1100 = Account.builder().id(UUID.randomUUID()).accountCode("1100").isActive(true).build();
        Account acc1200 = Account.builder().id(UUID.randomUUID()).accountCode("1200").isActive(true).build();
        Account acc1300 = Account.builder().id(UUID.randomUUID()).accountCode("1300").isActive(true).build();
        Account acc2200 = Account.builder().id(UUID.randomUUID()).accountCode("2200").isActive(true).build();

        when(accountRepository.findByAccountCode("1100")).thenReturn(Optional.of(acc1100));
        when(accountRepository.findByAccountCode("1200")).thenReturn(Optional.of(acc1200));
        when(accountRepository.findByAccountCode("1300")).thenReturn(Optional.of(acc1300));
        when(accountRepository.findByAccountCode("2200")).thenReturn(Optional.of(acc2200));

        List<JournalEntryLineRequest> lines = List.of(
                new JournalEntryLineRequest("1000", null, new BigDecimal("100.25"), BigDecimal.ZERO, "Dr 1"),
                new JournalEntryLineRequest("1001", null, new BigDecimal("200.50"), BigDecimal.ZERO, "Dr 2"),
                new JournalEntryLineRequest("1100", null, new BigDecimal("300.00"), BigDecimal.ZERO, "Dr 3"),
                new JournalEntryLineRequest("1200", null, new BigDecimal("150.15"), BigDecimal.ZERO, "Dr 4"),
                new JournalEntryLineRequest("1300", null, new BigDecimal("249.10"), BigDecimal.ZERO, "Dr 5"), // Total Debits = 1000.00
                new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("600.00"), "Cr 1"),
                new JournalEntryLineRequest("2200", null, BigDecimal.ZERO, new BigDecimal("400.00"), "Cr 2")  // Total Credits = 1000.00
        );

        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "CMP-001", "Compound 7-line transaction", lines
        );

        JournalEntryResponse response = journalEntryService.postEntry(request);
        assertThat(response.status()).isEqualTo(JournalEntryStatus.POSTED.name());
        assertThat(response.lines()).hasSize(7);
    }

    @Test
    @DisplayName("Invariance: Imbalance of 0.01 cent strictly fails with Trial Balance failure")
    void testOffByOneCent_failsTrialBalance() {
        List<JournalEntryLineRequest> lines = List.of(
                new JournalEntryLineRequest("1000", null, new BigDecimal("1000.00"), BigDecimal.ZERO, "Dr"),
                new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("1000.01"), "Cr")
        );

        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "ERR-001", "Off by one cent", lines
        );

        assertThatThrownBy(() -> journalEntryService.postEntry(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Trial Balance failure: Total Debits (1000.00) != Total Credits (1000.01)");
    }

    @Test
    @DisplayName("Boundary: Line with both debit and credit is rejected")
    void testLineWithBothDebitAndCredit_rejected() {
        List<JournalEntryLineRequest> lines = List.of(
                new JournalEntryLineRequest("1000", null, new BigDecimal("500.00"), new BigDecimal("500.00"), "Both Dr and Cr"),
                new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("500.00"), "Cr")
        );

        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "ERR-002", "Invalid line", lines
        );

        assertThatThrownBy(() -> journalEntryService.postEntry(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("A single line cannot contain both a debit and a credit");
    }

    @Test
    @DisplayName("Boundary: Line with 0.00 debit and 0.00 credit is rejected")
    void testLineWithZeroDebitAndCredit_rejected() {
        List<JournalEntryLineRequest> lines = List.of(
                new JournalEntryLineRequest("1000", null, new BigDecimal("500.00"), BigDecimal.ZERO, "Dr"),
                new JournalEntryLineRequest("1001", null, BigDecimal.ZERO, BigDecimal.ZERO, "Zero"),
                new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("500.00"), "Cr")
        );

        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "ERR-003", "Zero line", lines
        );

        assertThatThrownBy(() -> journalEntryService.postEntry(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("A journal line must have a value greater than 0");
    }

    @Test
    @DisplayName("Security/Integrity: Posting to inactive account throws IllegalStateException")
    void testInactiveAccount_rejected() {
        acc5360.setActive(false);

        List<JournalEntryLineRequest> lines = List.of(
                new JournalEntryLineRequest("5360", null, new BigDecimal("500.00"), BigDecimal.ZERO, "Dr"),
                new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("500.00"), "Cr")
        );

        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "ERR-004", "Inactive account entry", lines
        );

        assertThatThrownBy(() -> journalEntryService.postEntry(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot post to inactive account: 5360");
    }
}
