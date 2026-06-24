package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.CreateJournalEntryRequest;
import com.jaytechwave.sacco.modules.accounting.api.dto.JournalEntryDTOs.JournalEntryLineRequest;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanRepayment;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanRepaymentStatus;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanRepaymentRepository;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanScheduleItemRepository;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanRepaymentService;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.api.dto.ManualPaymentDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import com.jaytechwave.sacco.modules.penalties.domain.entity.Penalty;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyRepayment;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyRepaymentStatus;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyStatus;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepaymentRepository;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
import com.jaytechwave.sacco.modules.penalties.domain.service.PenaltyRepaymentService;
import com.jaytechwave.sacco.modules.savings.api.dto.SavingsDTOs.ManualDepositRequest;
import com.jaytechwave.sacco.modules.savings.api.dto.SavingsDTOs.ManualWithdrawalRequest;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccount;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import com.jaytechwave.sacco.modules.savings.domain.service.SavingsService;
import com.jaytechwave.sacco.shared.util.SaccoDateUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * SAC-267: one wizard, one endpoint, every module. A staff member with
 * MANUAL_PAYMENT_POST records a cash payment they physically received,
 * picking the member, the module (Savings / Penalty / Loan / Custom), and —
 * for Penalty and Custom — exactly which thing it's paying off. Reuses each
 * module's existing posting engine rather than duplicating GL logic.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ManualPaymentService {

    private final MemberRepository           memberRepository;
    private final SavingsService             savingsService;
    private final SavingsAccountRepository   savingsAccountRepository;
    private final SavingsTransactionRepository savingsTransactionRepository;

    private final PenaltyRepository          penaltyRepository;
    private final PenaltyRepaymentRepository penaltyRepaymentRepository;
    private final PenaltyRepaymentService    penaltyRepaymentService;

    private final LoanApplicationRepository  loanApplicationRepository;
    private final LoanRepaymentRepository    loanRepaymentRepository;
    private final LoanScheduleItemRepository loanScheduleItemRepository;
    private final LoanRepaymentService       loanRepaymentService;

    private final PaymentProductRepository   paymentProductRepository;
    private final JournalEntryService        journalEntryService;

    /** Step 2/3 of the wizard — what can this specific member pay toward right now? */
    @Transactional(readOnly = true)
    public ManualPaymentContext getContext(UUID memberId) {
        BigDecimal savingsBalance = savingsAccountRepository.findByMemberId(memberId)
                .map(SavingsAccount::getId)
                .map(savingsTransactionRepository::calculateBalance)
                .orElse(BigDecimal.ZERO);

        List<OpenPenaltyOption> openPenalties = penaltyRepository
                .findByMemberIdAndStatusOrderByCreatedAtAsc(memberId, PenaltyStatus.OPEN)
                .stream()
                .map(p -> new OpenPenaltyOption(p.getId(), p.getPenaltyRule().getName(), p.getOutstandingAmount()))
                .toList();

        var activeLoan = loanApplicationRepository
                .findFirstByMemberIdAndStatusOrderByCreatedAtDesc(memberId, LoanStatus.ACTIVE);

        List<CustomProductOption> customProducts = paymentProductRepository
                .findByIsActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .filter(p -> p.getModuleType().name().equals("CUSTOM"))
                .map(p -> new CustomProductOption(p.getId(), p.getName(), p.getCode()))
                .toList();

        return new ManualPaymentContext(
                savingsBalance,
                openPenalties,
                activeLoan.isPresent(),
                activeLoan.map(loan -> sumOutstandingLoan(loan.getId())).orElse(null),
                customProducts
        );
    }

    /** Same computation as DepositAllocationValidationService.sumOutstandingLoan — total due minus paid, across schedule items. */
    private BigDecimal sumOutstandingLoan(UUID loanApplicationId) {
        List<LoanScheduleItem> items = loanScheduleItemRepository.findByLoanApplicationIdOrderByWeekNumberAsc(loanApplicationId);
        BigDecimal outstanding = items.stream()
                .map(i -> i.getTotalDue().subtract(i.getPrincipalPaid()).subtract(i.getInterestPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return outstanding.max(BigDecimal.ZERO);
    }

    @Transactional
    public ManualPaymentResponse recordPayment(ManualPaymentRequest request) {
        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        String ref = (request.externalReference() != null && !request.externalReference().isBlank())
                ? request.externalReference()
                : "MANUAL-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        // SAC-268: if this payment is funded by pulling from the member's existing
        // savings rather than new cash, withdraw it first — same shared reference
        // on both legs for audit traceability. The withdrawal posts Debit Savings /
        // Credit Bank, and the payment below posts Debit Bank / Credit <destination>;
        // the two Bank legs cancel out exactly, correctly reflecting that no real
        // cash moved — it's a reclassification, not a new inflow.
        FundingSource source = request.fundingSource() != null ? request.fundingSource() : FundingSource.CASH;
        if (source == FundingSource.SAVINGS_TRANSFER) {
            if (request.paymentType() == ManualPaymentType.SAVINGS) {
                throw new IllegalArgumentException("Cannot transfer from savings into savings.");
            }
            savingsService.processManualWithdrawal(new ManualWithdrawalRequest(
                    member.getId(), request.amount(),
                    "XFER-" + ref + " — moved to cover " + request.paymentType()
            ));
        }

        return switch (request.paymentType()) {
            case SAVINGS -> recordSavings(member, request, ref);
            case PENALTY -> recordPenalty(member, request, ref);
            case LOAN    -> recordLoan(member, request, ref);
            case CUSTOM  -> recordCustom(member, request, ref);
        };
    }

    private ManualPaymentResponse recordSavings(Member member, ManualPaymentRequest request, String ref) {
        var deposit = new ManualDepositRequest(
                member.getId(), request.amount(),
                request.channel() != null ? request.channel() : "CASH",
                null, ref, request.notes()
        );
        savingsService.processManualDeposit(deposit);
        // No "outstanding balance to pay off" concept for a savings deposit — null is correct here.
        return new ManualPaymentResponse("SAVINGS", "Savings Deposit", request.amount(), null, ref);
    }

    private ManualPaymentResponse recordPenalty(Member member, ManualPaymentRequest request, String ref) {
        boolean payAll = Boolean.TRUE.equals(request.payAllPenalties()) || request.targetPenaltyId() == null;

        String description;
        if (payAll) {
            List<Penalty> open = penaltyRepository.findByMemberIdAndStatusOrderByCreatedAtAsc(member.getId(), PenaltyStatus.OPEN);
            if (open.isEmpty()) throw new IllegalStateException("This member has no open penalties.");
            description = "All open penalties";
        } else {
            Penalty target = penaltyRepository.findById(request.targetPenaltyId())
                    .orElseThrow(() -> new IllegalArgumentException("Penalty not found"));
            if (!target.getMemberId().equals(member.getId())) {
                throw new IllegalArgumentException("That penalty does not belong to this member.");
            }
            description = target.getPenaltyRule().getName();
        }

        PenaltyRepayment repayment = PenaltyRepayment.builder()
                .memberId(member.getId())
                .targetPenaltyId(payAll ? null : request.targetPenaltyId())
                .amount(request.amount())
                .status(PenaltyRepaymentStatus.PENDING)
                .build();
        repayment = penaltyRepaymentRepository.save(repayment);
        penaltyRepaymentService.processCompletedRepayment(repayment.getId(), ref);

        BigDecimal remaining = penaltyRepository.findByMemberIdAndStatusOrderByCreatedAtAsc(member.getId(), PenaltyStatus.OPEN)
                .stream().map(Penalty::getOutstandingAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ManualPaymentResponse("PENALTY", description, request.amount(), remaining, ref);
    }

    private ManualPaymentResponse recordLoan(Member member, ManualPaymentRequest request, String ref) {
        LoanApplication activeLoan = loanApplicationRepository
                .findFirstByMemberIdAndStatusOrderByCreatedAtDesc(member.getId(), LoanStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("This member has no active loan."));

        LoanRepayment repayment = LoanRepayment.builder()
                .loanApplication(activeLoan)
                .amount(request.amount())
                .status(LoanRepaymentStatus.PENDING)
                .build();
        repayment = loanRepaymentRepository.save(repayment);
        loanRepaymentService.processCompletedRepayment(repayment.getId(), ref);

        BigDecimal remaining = sumOutstandingLoan(activeLoan.getId());
        return new ManualPaymentResponse("LOAN", "Loan Repayment", request.amount(), remaining, ref);
    }

    /**
     * CUSTOM has no domain engine of its own (SAC-261/263) — just a direct GL
     * credit to the product's configured account, same pattern as a split
     * deposit's custom-product batch, just for a single standalone payment.
     */
    private ManualPaymentResponse recordCustom(Member member, ManualPaymentRequest request, String ref) {
        if (request.customProductId() == null) {
            throw new IllegalArgumentException("A custom product must be selected.");
        }
        PaymentProduct product = paymentProductRepository.findById(request.customProductId())
                .orElseThrow(() -> new IllegalArgumentException("Payment product not found"));
        if (!product.isActive()) {
            throw new IllegalStateException(product.getName() + " is not currently active.");
        }

        journalEntryService.postEntry(new CreateJournalEntryRequest(
                java.time.LocalDate.now(SaccoDateUtils.NAIROBI),
                "MANUAL-" + product.getCode() + "-" + ref,
                product.getName() + " — manual cash payment",
                List.of(
                        new JournalEntryLineRequest("1001", member.getId(), request.amount(),
                                BigDecimal.ZERO, "Cash receipt — " + product.getName()),
                        new JournalEntryLineRequest(product.getGlAccount().getAccountCode(), member.getId(),
                                BigDecimal.ZERO, request.amount(), product.getName() + " contribution")
                )
        ));

        return new ManualPaymentResponse("CUSTOM", product.getName(), request.amount(), null, ref);
    }
}