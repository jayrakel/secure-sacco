package com.jaytechwave.sacco.modules.paymentproducts.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.obligations.domain.entity.PeriodStatus;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ProductAllocationPeriod;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ProductFrequency;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.DepositAllocationRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.ProductAllocationPeriodRepository;
import com.jaytechwave.sacco.modules.penalties.domain.entity.Penalty;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyStatus;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
import com.jaytechwave.sacco.modules.core.util.SaccoDateUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentProductComplianceService {

    private final PaymentProductRepository productRepository;
    private final MemberRepository memberRepository;
    private final ProductAllocationPeriodRepository periodRepository;
    private final DepositAllocationRepository allocationRepository;
    private final PenaltyRepository penaltyRepository;

    @Transactional
    public void evaluateAll() {
        log.info("Starting evaluation of custom product compliance periods");
        List<PaymentProduct> products = productRepository.findByIsActiveTrueOrderByDisplayOrderAsc().stream()
                .filter(PaymentProduct::isHasDeadlines)
                .toList();

        if (products.isEmpty()) {
            log.info("No active custom products with deadlines found.");
            return;
        }

        List<Member> activeMembers = memberRepository.findByStatus(MemberStatus.ACTIVE);
        LocalDate today = LocalDate.now(SaccoDateUtils.NAIROBI);

        for (PaymentProduct product : products) {
            log.info("Evaluating product: {}", product.getName());
            for (Member member : activeMembers) {
                evaluateMemberProduct(product, member, today);
            }
        }
        log.info("Finished evaluation of custom product compliance periods");
    }

    public ProductAllocationPeriod getOrCreateCurrentPeriod(PaymentProduct product, Member member, LocalDate today) {
        LocalDate effectiveStart = getEffectiveStartDate(product, member);
        LocalDate cursor = alignToPeriodStart(product.getFrequency(), effectiveStart);
        
        while (true) {
            LocalDate periodEnd = periodEndFor(product.getFrequency(), cursor);
            if (!today.isBefore(cursor) && !today.isAfter(periodEnd.plusDays(product.getGraceDays()))) {
                // This is the active window (including grace days)
                return evaluatePeriod(product, member, cursor, periodEnd, today);
            }
            if (cursor.isAfter(today)) {
                // We've passed today, so the current active period is the one that includes today
                // Wait, if today is strictly inside a period, the previous check catches it.
                // If today is before effectiveStart, this will be caught.
                return evaluatePeriod(product, member, alignToPeriodStart(product.getFrequency(), today), periodEndFor(product.getFrequency(), alignToPeriodStart(product.getFrequency(), today)), today);
            }
            cursor = nextPeriodStart(product.getFrequency(), cursor);
        }
    }

    private LocalDate getEffectiveStartDate(PaymentProduct product, Member member) {
        LocalDate productLaunch = product.getCreatedAt().withZoneSameInstant(SaccoDateUtils.NAIROBI).toLocalDate();
        LocalDate memberJoin = member.getCreatedAt().toLocalDate();
        return productLaunch.isAfter(memberJoin) ? productLaunch : memberJoin;
    }

    private void evaluateMemberProduct(PaymentProduct product, Member member, LocalDate today) {
        if (product.getRequiredAmount() == null || product.getFrequency() == null || product.getFrequency() == ProductFrequency.ONE_OFF) {
            return;
        }

        LocalDate effectiveStart = getEffectiveStartDate(product, member);
        LocalDate cursor = alignToPeriodStart(product.getFrequency(), effectiveStart);

        while (!cursor.isAfter(today)) {
            LocalDate periodEnd = periodEndFor(product.getFrequency(), cursor);
            evaluatePeriod(product, member, cursor, periodEnd, today);
            cursor = nextPeriodStart(product.getFrequency(), cursor);
        }
    }

    private ProductAllocationPeriod evaluatePeriod(PaymentProduct product, Member member, LocalDate start, LocalDate end, LocalDate today) {
        ProductAllocationPeriod period = periodRepository
                .findByProductIdAndMemberIdAndPeriodStart(product.getId(), member.getId(), start)
                .orElseGet(() -> periodRepository.save(
                        ProductAllocationPeriod.builder()
                                .product(product)
                                .memberId(member.getId())
                                .periodStart(start)
                                .periodEnd(end)
                                .requiredAmount(product.getRequiredAmount())
                                .status(PeriodStatus.DUE)
                                .build()));

        if (period.getStatus() == PeriodStatus.COVERED) return period;

        BigDecimal paid = computePaidInPeriod(product.getId(), member.getId(), start, end, product.getGraceDays());
        period.setPaidAmount(paid);

        if (paid.compareTo(period.getRequiredAmount()) >= 0) {
            period.setStatus(PeriodStatus.COVERED);
        } else if (isPastDeadline(end, product.getGraceDays(), today)) {
            if (period.getStatus() != PeriodStatus.OVERDUE) {
                period.setStatus(PeriodStatus.OVERDUE);
                applyPenaltyIfApplicable(product, member, period);
            }
        }
        return periodRepository.save(period);
    }

    private BigDecimal computePaidInPeriod(UUID productId, UUID memberId, LocalDate start, LocalDate end, int graceDays) {
        ZonedDateTime from = start.atStartOfDay(SaccoDateUtils.NAIROBI);
        ZonedDateTime to = end.plusDays(graceDays + 1L).atStartOfDay(SaccoDateUtils.NAIROBI);
        return allocationRepository.sumRoutedAmountByProductAndMemberBetween(productId, memberId, from, to);
    }

    private boolean isPastDeadline(LocalDate periodEnd, int graceDays, LocalDate today) {
        LocalDate cutoff = periodEnd.plusDays(graceDays);
        return today.isAfter(cutoff);
    }

    private void applyPenaltyIfApplicable(PaymentProduct product, Member member, ProductAllocationPeriod period) {
        if (!product.isAttractsPenalties() || product.getPenaltyRule() == null) {
            return;
        }

        // Apply penalty rule
        log.info("Applying penalty {} to member {} for product {}", product.getPenaltyRule().getCode(), member.getMemberNumber(), product.getName());
        // Standard penalty creation logic here (ideally via an event or service call, but we can do it directly)
        Penalty penalty = Penalty.builder()
                .memberId(member.getId())
                .penaltyRule(product.getPenaltyRule())
                .originalAmount(product.getPenaltyRule().getBaseAmountValue()) // simplistic logic for now
                .outstandingAmount(product.getPenaltyRule().getBaseAmountValue())
                .status(PenaltyStatus.OPEN)
                .build();
        penaltyRepository.save(penalty);
    }

    private LocalDate alignToPeriodStart(ProductFrequency freq, LocalDate date) {
        if (freq == ProductFrequency.MONTHLY) {
            return date.withDayOfMonth(1);
        } else if (freq == ProductFrequency.WEEKLY) {
            if (date.getDayOfWeek() == DayOfWeek.FRIDAY) {
                return date.plusDays(1);
            }
            return date.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.SATURDAY));
        }
        return date;
    }

    private LocalDate periodEndFor(ProductFrequency freq, LocalDate start) {
        return freq == ProductFrequency.WEEKLY ? start.plusDays(5) : start.plusMonths(1).minusDays(1);
    }

    private LocalDate nextPeriodStart(ProductFrequency freq, LocalDate current) {
        return freq == ProductFrequency.WEEKLY ? current.plusWeeks(1) : current.plusMonths(1);
    }
}
