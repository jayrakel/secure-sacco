package com.jaytechwave.sacco.modules.accounting.domain.repository;

import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntryLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JournalEntryLineRepository extends JpaRepository<JournalEntryLine, UUID> {

    // Fetches all lines related to a specific member (e.g., checking their specific savings/loan history)
    List<JournalEntryLine> findByMemberId(UUID memberId);

    // Fetches all lines for a specific account (e.g., generating an account ledger/statement)
    List<JournalEntryLine> findByAccountId(UUID accountId);
}