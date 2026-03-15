package com.jaytechwave.sacco.modules.accounting.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.*;
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
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
@DisplayName("JournalEntryService — Double-Entry Validation")
class JournalEntryServiceTest {

    @Mock JournalEntryRepository journalEntryRepository;
    @Mock AccountRepository accountRepository;
    @Mock SecurityAuditService securityAuditService;

    @InjectMocks
    private JournalEntryService service;

    private Account debitAccount;
    private Account creditAccount;

    @BeforeEach
    void setUp() {
        debitAccount = Account.builder()
                .id(UUID.randomUUID())
                .accountCode("1000")
                .accountName("Cash on Hand")
                .isActive(true)
                .build();

        creditAccount = Account.builder()
                .id(UUID.randomUUID())
                .accountCode("2100")
                .accountName("Member Savings")
                .isActive(true)
                .build();

        lenient().when(journalEntryRepository.existsByReferenceNumber(anyString())).thenReturn(false);
        lenient().when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(accountRepository.findByAccountCode("1000")).thenReturn(Optional.of(debitAccount));
        lenient().when(accountRepository.findByAccountCode("2100")).thenReturn(Optional.of(creditAccount));
    }

    // ─── Balanced entry ──────────────────────────────────────────────

    @Test
    @DisplayName("posts a balanced entry without throwing")
    void postEntry_balancedEntry_succeeds() {
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "TEST-001", "Balanced test entry",
                List.of(
                        new JournalEntryLineRequest("1000", null, new BigDecimal("1000.00"), BigDecimal.ZERO, "Debit"),
                        new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("1000.00"), "Credit")
                )
        );

        assertThatNoException().isThrownBy(() -> service.postEntry(request));
        verify(journalEntryRepository).save(any(JournalEntry.class));
    }

    @Test
    @DisplayName("saved entry status is POSTED")
    void postEntry_savedEntryIsPosted() {
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "TEST-002", "Status test",
                List.of(
                        new JournalEntryLineRequest("1000", null, new BigDecimal("500.00"), BigDecimal.ZERO, "Dr"),
                        new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("500.00"), "Cr")
                )
        );

        JournalEntryResponse response = service.postEntry(request);
        assertThat(response.status()).isEqualTo(JournalEntryStatus.POSTED.name());
    }

    // ─── Unbalanced entries must be rejected ──────────────────────────

    @Test
    @DisplayName("rejects entry where debits exceed credits")
    void postEntry_debitExceedsCredit_throws() {
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "TEST-003", "Unbalanced",
                List.of(
                        new JournalEntryLineRequest("1000", null, new BigDecimal("1500.00"), BigDecimal.ZERO, "Dr"),
                        new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("1000.00"), "Cr")
                )
        );

        assertThatThrownBy(() -> service.postEntry(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Trial Balance failure");
    }

    @Test
    @DisplayName("rejects entry where credits exceed debits")
    void postEntry_creditExceedsDebit_throws() {
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "TEST-004", "Unbalanced",
                List.of(
                        new JournalEntryLineRequest("1000", null, new BigDecimal("800.00"), BigDecimal.ZERO, "Dr"),
                        new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("1200.00"), "Cr")
                )
        );

        assertThatThrownBy(() -> service.postEntry(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Trial Balance failure");
    }

    // ─── Structural validation ────────────────────────────────────────

    @Test
    @DisplayName("rejects entry with fewer than two lines")
    void postEntry_singleLine_throws() {
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "TEST-005", "Single line",
                List.of(
                        new JournalEntryLineRequest("1000", null, new BigDecimal("500.00"), BigDecimal.ZERO, "Dr")
                )
        );

        assertThatThrownBy(() -> service.postEntry(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least two lines");
    }

    @Test
    @DisplayName("rejects line that has both debit and credit amounts")
    void postEntry_lineWithBothDebitAndCredit_throws() {
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "TEST-006", "Mixed line",
                List.of(
                        new JournalEntryLineRequest("1000", null, new BigDecimal("500.00"), new BigDecimal("500.00"), "Dr+Cr"),
                        new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("500.00"), "Cr")
                )
        );

        assertThatThrownBy(() -> service.postEntry(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot contain both");
    }

    @Test
    @DisplayName("rejects line with zero debit and zero credit")
    void postEntry_lineWithZeroValues_throws() {
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "TEST-007", "Zero line",
                List.of(
                        new JournalEntryLineRequest("1000", null, BigDecimal.ZERO, BigDecimal.ZERO, "Zero"),
                        new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("500.00"), "Cr")
                )
        );

        assertThatThrownBy(() -> service.postEntry(request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ─── Idempotency / duplicate reference ───────────────────────────

    @Test
    @DisplayName("rejects duplicate reference number")
    void postEntry_duplicateReference_throws() {
        when(journalEntryRepository.existsByReferenceNumber("DUP-001")).thenReturn(true);

        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "DUP-001", "Duplicate",
                List.of(
                        new JournalEntryLineRequest("1000", null, new BigDecimal("100.00"), BigDecimal.ZERO, "Dr"),
                        new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("100.00"), "Cr")
                )
        );

        assertThatThrownBy(() -> service.postEntry(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");

        verify(journalEntryRepository, never()).save(any());
    }

    // ─── Inactive account guard ───────────────────────────────────────

    @Test
    @DisplayName("rejects posting to an inactive account")
    void postEntry_inactiveAccount_throws() {
        debitAccount.setActive(false);

        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "TEST-008", "Inactive account",
                List.of(
                        new JournalEntryLineRequest("1000", null, new BigDecimal("200.00"), BigDecimal.ZERO, "Dr"),
                        new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("200.00"), "Cr")
                )
        );

        assertThatThrownBy(() -> service.postEntry(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("inactive account");
    }

    // ─── Multi-line balanced entry ────────────────────────────────────

    @Test
    @DisplayName("accepts a compound entry with multiple debit and credit lines")
    void postEntry_compoundEntry_succeeds() {
        Account secondDebit = Account.builder()
                .id(UUID.randomUUID()).accountCode("1200")
                .accountName("Loans Receivable").isActive(true).build();

        when(accountRepository.findByAccountCode("1200")).thenReturn(Optional.of(secondDebit));

        // Dr 1000 + Dr 500 = Cr 1500 — compound balanced entry
        CreateJournalEntryRequest request = new CreateJournalEntryRequest(
                LocalDate.now(), "TEST-009", "Compound entry",
                List.of(
                        new JournalEntryLineRequest("1000", null, new BigDecimal("1000.00"), BigDecimal.ZERO, "Dr1"),
                        new JournalEntryLineRequest("1200", null, new BigDecimal("500.00"), BigDecimal.ZERO, "Dr2"),
                        new JournalEntryLineRequest("2100", null, BigDecimal.ZERO, new BigDecimal("1500.00"), "Cr")
                )
        );

        assertThatNoException().isThrownBy(() -> service.postEntry(request));
    }
}