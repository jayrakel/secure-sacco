package com.jaytechwave.sacco.modules.expense.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.expense.api.dto.SaccoExpenseDTOs.*;
import com.jaytechwave.sacco.modules.expense.domain.entity.SaccoExpense;
import com.jaytechwave.sacco.modules.expense.domain.repository.SaccoExpenseRepository;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SaccoExpenseService {

    private final SaccoExpenseRepository saccoExpenseRepository;
    private final JournalEntryService journalEntryService;
    private final SecurityAuditService securityAuditService;
    private final UserRepository userRepository;

    @Transactional
    public SaccoExpenseResponse recordExpense(RecordSaccoExpenseRequest req, String actorEmail) {
        UUID actorId = userRepository.findByEmail(actorEmail)
                .map(u -> u.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        SaccoExpense expense = SaccoExpense.builder()
                .expenseDate(req.expenseDate())
                .amount(req.amount())
                .glAccountCode(req.glAccountCode())
                .narration(req.narration())
                .reference(req.reference())
                .createdByUserId(actorId)
                .build();

        SaccoExpense saved = saccoExpenseRepository.save(expense);

        String journalRef = "EXPENSE-" + saved.getId();
        journalEntryService.postSaccoExpense(
                saved.getId(),
                saved.getAmount(),
                saved.getGlAccountCode(),
                saved.getNarration()
        );
        
        saved.setJournalReference(journalRef);
        saved = saccoExpenseRepository.save(saved);

        securityAuditService.logEvent(
                "SACCO_EXPENSE_RECORDED",
                journalRef,
                String.format("Sacco expense of KES %s recorded to GL %s by %s",
                        saved.getAmount(), saved.getGlAccountCode(), actorEmail)
        );

        log.info("SAC-EXP: Recorded expense {} for KES {}", saved.getId(), saved.getAmount());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SaccoExpenseResponse> listAll() {
        return saccoExpenseRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).toList();
    }

    private SaccoExpenseResponse toResponse(SaccoExpense e) {
        return new SaccoExpenseResponse(
                e.getId(), e.getExpenseDate(), e.getAmount(), e.getGlAccountCode(),
                e.getNarration(), e.getReference(), e.getJournalReference(),
                e.getCreatedByUserId(), e.getCreatedAt(), e.getUpdatedAt()
        );
    }
}
