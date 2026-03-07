package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
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
    private final SecurityAuditService securityAuditService;

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
        if (repayment.getStatus() == LoanRepaymentStatus.COMPLETED) return;

        LoanApplication app = repayment.getLoanApplication();

        app.setPrepaymentBalance(app.getPrepaymentBalance().add(repayment.getAmount()));

        BigDecimal[] allocations = executeWaterfallAllocation(app);
        BigDecimal interestAllocated = allocations[0];
        BigDecimal principalAllocated = allocations[1];

        BigDecimal prepaymentAllocated = repayment.getAmount().subtract(interestAllocated).subtract(principalAllocated);

        repayment.setPrincipalAllocated(principalAllocated);
        repayment.setInterestAllocated(interestAllocated);
        repayment.setPrepaymentAllocated(prepaymentAllocated);
        repayment.setStatus(LoanRepaymentStatus.COMPLETED);
        repayment.setReceiptNumber(receiptNumber);
        loanRepaymentRepository.save(repayment);

        journalEntryService.postLoanRepayment(app.getMemberId(), repayment.getAmount(), interestAllocated, receiptNumber);

        securityAuditService.logEvent(
                "LOAN_REPAYMENT_POSTED",
                app.getId().toString(),
                "KES " + repayment.getAmount() + " repayment posted. Receipt: " + receiptNumber
                        + ". Principal: " + principalAllocated + ", Interest: " + interestAllocated
        );

        log.info("Allocated Mpesa Repayment {}. Int: {}, Prin: {}, Excess Credit: {}",
                receiptNumber, interestAllocated, principalAllocated, prepaymentAllocated);
    }

    @Transactional
    public void autoConsumeAllPrepayments() {
        List<LoanApplication> appsWithCredit = loanApplicationRepository.findByPrepaymentBalanceGreaterThan(BigDecimal.ZERO)
                .stream().filter(app -> app.getStatus() == LoanStatus.ACTIVE || app.getStatus() == LoanStatus.IN_GRACE).toList();

        for (LoanApplication app : appsWithCredit) {
            BigDecimal[] allocated = executeWaterfallAllocation(app);
            if (allocated[0].compareTo(BigDecimal.ZERO) > 0 || allocated[1].compareTo(BigDecimal.ZERO) > 0) {
                log.info("Auto-consumed Prepayment Credit for App {}. Paid Int: {}, Prin: {}", app.getId(), allocated[0], allocated[1]);
            }
        }
    }

    @Transactional
    public BigDecimal[] executeWaterfallAllocation(LoanApplication app) {
        BigDecimal remainingCredit = app.getPrepaymentBalance();
        BigDecimal interestPaidThisRun = BigDecimal.ZERO;
        BigDecimal principalPaidThisRun = BigDecimal.ZERO;

        List<LoanScheduleItem> targetItems = scheduleItemRepository.findByLoanApplicationIdOrderByWeekNumberAsc(app.getId())
                .stream().filter(i -> i.getStatus() == LoanScheduleStatus.DUE || i.getStatus() == LoanScheduleStatus.OVERDUE).toList();

        for (LoanScheduleItem item : targetItems) {
            if (remainingCredit.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal unpaidInterest = item.getInterestDue().subtract(item.getInterestPaid());
            if (unpaidInterest.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal toPay = unpaidInterest.min(remainingCredit);
                item.setInterestPaid(item.getInterestPaid().add(toPay));
                interestPaidThisRun = interestPaidThisRun.add(toPay);
                remainingCredit = remainingCredit.subtract(toPay);
            }
        }

        for (LoanScheduleItem item : targetItems) {
            if (remainingCredit.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal unpaidPrincipal = item.getPrincipalDue().subtract(item.getPrincipalPaid());
            if (unpaidPrincipal.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal toPay = unpaidPrincipal.min(remainingCredit);
                item.setPrincipalPaid(item.getPrincipalPaid().add(toPay));
                principalPaidThisRun = principalPaidThisRun.add(toPay);
                remainingCredit = remainingCredit.subtract(toPay);
            }
        }

        for (LoanScheduleItem item : targetItems) {
            if (item.getPrincipalPaid().add(item.getInterestPaid()).compareTo(item.getTotalDue()) >= 0) {
                item.setStatus(LoanScheduleStatus.PAID);
            }
        }
        scheduleItemRepository.saveAll(targetItems);

        app.setPrepaymentBalance(remainingCredit);

        List<LoanScheduleItem> allItems = scheduleItemRepository.findByLoanApplicationIdOrderByWeekNumberAsc(app.getId());
        if (allItems.stream().allMatch(i -> i.getStatus() == LoanScheduleStatus.PAID)) {
            app.setStatus(LoanStatus.CLOSED);

            securityAuditService.logEvent(
                    "LOAN_CLOSED",
                    app.getId().toString(),
                    "Loan fully repaid and closed"
            );
        }
        loanApplicationRepository.save(app);

        return new BigDecimal[]{interestPaidThisRun, principalPaidThisRun};
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