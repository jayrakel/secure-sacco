package com.jaytechwave.sacco.modules.accounting.domain.repository;

import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntry;
import com.jaytechwave.sacco.modules.accounting.domain.entity.JournalEntryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {
    
    @Modifying
    @Query("UPDATE JournalEntry je SET je.referenceNumber = :newRef WHERE je.referenceNumber = :oldRef")
    int updateReferenceNumber(@Param("oldRef") String oldRef, @Param("newRef") String newRef);

    Optional<JournalEntry> findByReferenceNumber(String referenceNumber);

    boolean existsByReferenceNumber(String referenceNumber);

    List<JournalEntry> findByStatus(JournalEntryStatus status);

    List<JournalEntry> findByTransactionDateBetween(LocalDate startDate, LocalDate endDate);
}