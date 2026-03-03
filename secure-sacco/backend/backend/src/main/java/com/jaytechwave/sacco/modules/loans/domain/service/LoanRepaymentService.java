package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.RepayLoanRequest;
import com.jaytechwave.sacco.modules.loans.domain.entity.*;
import com.jaytechwave.sacco.modules.loans.domain.repository.*;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanRepaymentService {

    private final LoanRepaymentRepository loanRepaymentRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanScheduleItemRepository scheduleItemRepository;
    private final PaymentService paymentService;
    private final UserRepository userRepository;
    private final JournalEntryService journalEntryService;

    @Transactional
    public InitiateStkResponse initiateRepayment(UUID applicationId, RepayLoanRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId).orElseThrow();

        if (!app.getMemberId().equals(user.getMember().getId())) throw new IllegalStateException("Not authorized.");
        if (app.getStatus() != LoanStatus.ACTIVE && app.getStatus() != LoanStatus.IN_GRACE && app.getStatus() != LoanStatus.DEFAULTED) {
            throw new IllegalStateException("Loan is not in an active state to receive payments.");
        }

        LoanRepayment repayment = LoanRepayment.builder()
                .loanApplication(app).amount(request.amount()).status(LoanRepaymentStatus.PENDING)
                .build();
        repayment = loanRepaymentRepository.save(repayment);

        return paymentService.initiateMpesaStkPush(
                new InitiateStkRequest(request.phoneNumber(), request.amount(), "LNREP-" + repayment.getId()),
                user.getMember().getId()
        );
    }

    @Transactional
    public void processCompletedRepayment(UUID repaymentId, String receiptNumber) {
        LoanRepayment repayment = loanRepaymentRepository.findById(repaymentId).orElseThrow();

        // Idempotency: Prevent double posting
        if (repayment.getStatus() == LoanRepaymentStatus.COMPLETED) {
            log.info("Idempotency hit: Repayment {} already processed.", repaymentId);
            return;
        }

        LoanApplication app = repayment.getLoanApplication();
        BigDecimal remaining = repayment.getAmount();
        BigDecimal interestAllocated = BigDecimal.ZERO;
        BigDecimal principalAllocated = BigDecimal.ZERO;

        List<LoanScheduleItem> items = scheduleItemRepository.findByLoanApplicationIdOrderByWeekNumberAsc(app.getId());

        // PASS 1: Pay Interest (Oldest first)
        for (LoanScheduleItem item : items) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal unpaidInterest = item.getInterestDue().subtract(item.getInterestPaid());
            if (unpaidInterest.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal toPay = unpaidInterest.min(remaining);
                item.setInterestPaid(item.getInterestPaid().add(toPay));
                interestAllocated = interestAllocated.add(toPay);
                remaining = remaining.subtract(toPay);
            }
        }

        // PASS 2: Pay Principal (Oldest first)
        for (LoanScheduleItem item : items) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal unpaidPrincipal = item.getPrincipalDue().subtract(item.getPrincipalPaid());
            if (unpaidPrincipal.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal toPay = unpaidPrincipal.min(remaining);
                item.setPrincipalPaid(item.getPrincipalPaid().add(toPay));
                principalAllocated = principalAllocated.add(toPay);
                remaining = remaining.subtract(toPay);
            }
        }

        // STATUS UPDATES
        for (LoanScheduleItem item : items) {
            BigDecimal totalPaid = item.getPrincipalPaid().add(item.getInterestPaid());
            if (totalPaid.compareTo(item.getTotalDue()) >= 0) {
                item.setStatus(LoanScheduleStatus.PAID);
            } else if (item.getDueDate().isBefore(LocalDate.now()) && totalPaid.compareTo(item.getTotalDue()) < 0) {
                item.setStatus(LoanScheduleStatus.OVERDUE);
            }
        }
        scheduleItemRepository.saveAll(items);

        // PASS 3: Prepayment Credit Engine
        BigDecimal prepaymentAllocated = remaining;
        if (prepaymentAllocated.compareTo(BigDecimal.ZERO) > 0) {
            app.setPrepaymentBalance(app.getPrepaymentBalance().add(prepaymentAllocated));
        }

        // Close loan if fully paid
        boolean fullyPaid = items.stream().allMatch(i -> i.getStatus() == LoanScheduleStatus.PAID);
        if (fullyPaid) app.setStatus(LoanStatus.CLOSED);
        loanApplicationRepository.save(app);

        // Update Repayment State
        repayment.setPrincipalAllocated(principalAllocated);
        repayment.setInterestAllocated(interestAllocated);
        repayment.setPrepaymentAllocated(prepaymentAllocated);
        repayment.setStatus(LoanRepaymentStatus.COMPLETED);
        repayment.setReceiptNumber(receiptNumber);
        loanRepaymentRepository.save(repayment);

        // POST TO GL
        journalEntryService.postLoanRepayment(app.getMemberId(), repayment.getAmount(), interestAllocated, receiptNumber);

        log.info("Successfully allocated Mpesa Loan Repayment {}. Int: {}, Prin: {}, Prep: {}", receiptNumber, interestAllocated, principalAllocated, prepaymentAllocated);
    }

    @Transactional
    public void processFailedRepayment(UUID repaymentId) {
        loanRepaymentRepository.findById(repaymentId).ifPresent(rep -> {
            if (rep.getStatus() == LoanRepaymentStatus.PENDING) {
                rep.setStatus(LoanRepaymentStatus.FAILED);
                loanRepaymentRepository.save(rep);
            }
        });
    }
}