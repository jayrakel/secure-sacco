package com.jaytechwave.sacco.modules.paymentproducts.domain.service;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanScheduleItemRepository;
import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import com.jaytechwave.sacco.modules.penalties.domain.entity.Penalty;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyStatus;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Validates a member's deposit split before any STK push is sent.
 *
 * Two checks:
 *  1. Percentages across all allocation lines sum to exactly 100%.
 *  2. For capped module types (LOAN, PENALTY), the allocated amount does not
 *     exceed the member's live outstanding balance for that product — Option A
 *     from SAC-261: reject upfront rather than silently redirect or overpay.
 */
@Service
@RequiredArgsConstructor
public class DepositAllocationValidationService {

    private static final BigDecimal HUNDRED  = BigDecimal.valueOf(100);
    private static final BigDecimal TOLERANCE = new BigDecimal("0.01"); // allow rounding slack

    private final PaymentProductRepository    productRepository;
    private final PenaltyRepository           penaltyRepository;
    private final LoanApplicationRepository   loanApplicationRepository;
    private final LoanScheduleItemRepository  loanScheduleItemRepository;

    @Transactional(readOnly = true)
    public List<ProductAllocationContext> getAllocationContext(UUID memberId) {
        List<PaymentProduct> products = productRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
        List<ProductAllocationContext> result = new ArrayList<>();

        for (PaymentProduct p : products) {
            BigDecimal outstanding = switch (p.getModuleType()) {
                case PENALTY -> sumOpenPenalties(memberId);
                case LOAN    -> sumOutstandingLoan(memberId).orElse(null);
                default      -> null; // SAVINGS / CUSTOM — uncapped
            };
            boolean capped = p.getModuleType() == ModuleType.PENALTY || p.getModuleType() == ModuleType.LOAN;
            result.add(new ProductAllocationContext(
                    p.getId(), p.getCode(), p.getName(), p.getModuleType(), capped, outstanding
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public ValidateAllocationResponse validate(UUID memberId, ValidateAllocationRequest request) {
        List<String> errors = new ArrayList<>();

        if (request.allocations() == null || request.allocations().isEmpty()) {
            return new ValidateAllocationResponse(false, "At least one allocation is required", List.of());
        }

        BigDecimal totalPct = request.allocations().stream()
                .map(AllocationLine::percentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalPct.subtract(HUNDRED).abs().compareTo(TOLERANCE) > 0) {
            errors.add(String.format("Allocations must total 100%% — currently %.2f%%", totalPct));
        }

        for (AllocationLine line : request.allocations()) {
            PaymentProduct product = productRepository.findById(line.productId())
                    .orElse(null);
            if (product == null) {
                errors.add("Unknown product: " + line.productId());
                continue;
            }
            if (!product.isActive()) {
                errors.add(product.getName() + " is not currently available");
                continue;
            }

            BigDecimal lineAmount = request.totalAmount()
                    .multiply(line.percentage())
                    .divide(HUNDRED, 2, RoundingMode.HALF_UP);

            BigDecimal cap = switch (product.getModuleType()) {
                case PENALTY -> sumOpenPenalties(memberId);
                case LOAN    -> sumOutstandingLoan(memberId).orElse(null);
                default      -> null;
            };

            if (cap != null && lineAmount.compareTo(cap) > 0) {
                errors.add(String.format(
                        "%s: allocated KES %.2f exceeds outstanding balance of KES %.2f",
                        product.getName(), lineAmount, cap));
            }
            if (cap != null && cap.compareTo(BigDecimal.ZERO) == 0 && lineAmount.compareTo(BigDecimal.ZERO) > 0) {
                errors.add(product.getName() + ": you have no outstanding balance for this product");
            }
        }

        if (!errors.isEmpty()) {
            return new ValidateAllocationResponse(false, errors.get(0), errors);
        }
        return new ValidateAllocationResponse(true, null, List.of());
    }

    // ── Outstanding balance calculators ───────────────────────────────────────

    BigDecimal sumOpenPenalties(UUID memberId) {
        List<Penalty> open = penaltyRepository.findByMemberIdAndStatus(memberId, PenaltyStatus.OPEN);
        return open.stream()
                .map(Penalty::getOutstandingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    Optional<BigDecimal> sumOutstandingLoan(UUID memberId) {
        Optional<LoanApplication> activeLoan =
                loanApplicationRepository.findFirstByMemberIdAndStatusOrderByCreatedAtDesc(memberId, LoanStatus.ACTIVE);
        if (activeLoan.isEmpty()) return Optional.empty();

        List<LoanScheduleItem> items =
                loanScheduleItemRepository.findByLoanApplicationIdOrderByWeekNumberAsc(activeLoan.get().getId());

        BigDecimal outstanding = items.stream()
                .map(i -> i.getTotalDue()
                        .subtract(i.getPrincipalPaid())
                        .subtract(i.getInterestPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Optional.of(outstanding.max(BigDecimal.ZERO));
    }
}