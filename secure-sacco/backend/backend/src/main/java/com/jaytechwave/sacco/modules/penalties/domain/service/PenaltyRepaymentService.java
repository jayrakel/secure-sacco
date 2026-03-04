package com.jaytechwave.sacco.modules.penalties.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PayPenaltyRequest;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltySummaryResponse;
import com.jaytechwave.sacco.modules.penalties.domain.entity.*;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepaymentRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PenaltyRepaymentService {

    private final PenaltyRepository penaltyRepository;
    private final PenaltyRepaymentRepository penaltyRepaymentRepository;
    private final UserRepository userRepository;
    private final PaymentService paymentService;
    private final JournalEntryService journalEntryService;

    @Transactional(readOnly = true)
    public List<PenaltySummaryResponse> getMemberOpenPenalties(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        if (user.getMember() == null) return List.of();

        return penaltyRepository.findByMemberIdAndStatusOrderByCreatedAtAsc(user.getMember().getId(), PenaltyStatus.OPEN)
                .stream().map(p -> new PenaltySummaryResponse(
                        p.getId(), p.getPenaltyRule().getCode(), p.getPenaltyRule().getName(),
                        p.getOriginalAmount(), p.getOutstandingAmount(), p.getPrincipalPaid(),
                        p.getInterestPaid(), p.getAmountWaived(), p.getStatus().name(), p.getCreatedAt() // <--- Added amountWaived
                )).collect(Collectors.toList());
    }

    @Transactional
    public InitiateStkResponse initiateRepayment(PayPenaltyRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();

        PenaltyRepayment repayment = PenaltyRepayment.builder()
                .memberId(user.getMember().getId())
                .targetPenaltyId(request.penaltyId())
                .amount(request.amount())
                .status(PenaltyRepaymentStatus.PENDING)
                .build();
        repayment = penaltyRepaymentRepository.save(repayment);

        return paymentService.initiateMpesaStkPush(
                new InitiateStkRequest(request.phoneNumber(), request.amount(), "PENREP-" + repayment.getId()),
                user.getMember().getId()
        );
    }

    @Transactional
    public void processCompletedRepayment(UUID repaymentId, String receiptNumber) {
        PenaltyRepayment repayment = penaltyRepaymentRepository.findById(repaymentId).orElseThrow();
        if (repayment.getStatus() == PenaltyRepaymentStatus.COMPLETED) return; // Idempotency check

        BigDecimal remainingAmount = repayment.getAmount();
        BigDecimal totalInterestAllocated = BigDecimal.ZERO;
        BigDecimal totalPrincipalAllocated = BigDecimal.ZERO;

        List<Penalty> targetPenalties = repayment.getTargetPenaltyId() != null
                ? List.of(penaltyRepository.findById(repayment.getTargetPenaltyId()).orElseThrow())
                : penaltyRepository.findByMemberIdAndStatusOrderByCreatedAtAsc(repayment.getMemberId(), PenaltyStatus.OPEN);

        for (Penalty penalty : targetPenalties) {
            if (remainingAmount.compareTo(BigDecimal.ZERO) <= 0) break;

            // Calculate totals strictly from immutable accruals ledger
            BigDecimal totalPrincipalOwed = penalty.getAccruals().stream().filter(a -> a.getAccrualKind() == AccrualKind.PRINCIPAL).map(PenaltyAccrual::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalInterestOwed = penalty.getAccruals().stream().filter(a -> a.getAccrualKind() == AccrualKind.INTEREST).map(PenaltyAccrual::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            // PASS 1: Pay Interest First
            BigDecimal unpaidInterest = totalInterestOwed.subtract(penalty.getInterestPaid());
            if (unpaidInterest.compareTo(BigDecimal.ZERO) > 0 && remainingAmount.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal toPay = unpaidInterest.min(remainingAmount);
                penalty.setInterestPaid(penalty.getInterestPaid().add(toPay));
                totalInterestAllocated = totalInterestAllocated.add(toPay);
                remainingAmount = remainingAmount.subtract(toPay);
            }

            // PASS 2: Pay Principal Second
            BigDecimal unpaidPrincipal = totalPrincipalOwed.subtract(penalty.getPrincipalPaid());
            if (unpaidPrincipal.compareTo(BigDecimal.ZERO) > 0 && remainingAmount.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal toPay = unpaidPrincipal.min(remainingAmount);
                penalty.setPrincipalPaid(penalty.getPrincipalPaid().add(toPay));
                totalPrincipalAllocated = totalPrincipalAllocated.add(toPay);
                remainingAmount = remainingAmount.subtract(toPay);
            }

            // Update Header status
            BigDecimal newOutstanding = totalPrincipalOwed.add(totalInterestOwed)
                    .subtract(penalty.getPrincipalPaid())
                    .subtract(penalty.getInterestPaid())
                    .subtract(penalty.getAmountWaived());

            penalty.setOutstandingAmount(newOutstanding);
            if (newOutstanding.compareTo(BigDecimal.ZERO) <= 0) penalty.setStatus(PenaltyStatus.PAID);
        }
        penaltyRepository.saveAll(targetPenalties);

        repayment.setPrincipalAllocated(totalPrincipalAllocated);
        repayment.setInterestAllocated(totalInterestAllocated);
        repayment.setStatus(PenaltyRepaymentStatus.COMPLETED);
        repayment.setReceiptNumber(receiptNumber);
        penaltyRepaymentRepository.save(repayment);

        // GL Posting - Note: We strictly record what was ALOOCATED. Overpayments are ignored in this strict allocation run.
        BigDecimal totalAllocated = totalInterestAllocated.add(totalPrincipalAllocated);
        if (totalAllocated.compareTo(BigDecimal.ZERO) > 0) {
            journalEntryService.postPenaltyRepayment(repayment.getMemberId(), totalAllocated, totalInterestAllocated, totalPrincipalAllocated, receiptNumber);
        }

        log.info("Allocated Mpesa Penalty Repayment {}. Int: {}, Prin: {}", receiptNumber, totalInterestAllocated, totalPrincipalAllocated);
    }

    @Transactional
    public void processFailedRepayment(UUID repaymentId) {
        penaltyRepaymentRepository.findById(repaymentId).ifPresent(rep -> {
            if (rep.getStatus() == PenaltyRepaymentStatus.PENDING) {
                rep.setStatus(PenaltyRepaymentStatus.FAILED);
                penaltyRepaymentRepository.save(rep);
            }
        });
    }
}