package com.jaytechwave.sacco.modules.obligations.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.obligations.api.dto.ObligationDTOs.*;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyStatus;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
import com.jaytechwave.sacco.modules.obligations.domain.entity.*;
import com.jaytechwave.sacco.modules.obligations.domain.repository.SavingsObligationPeriodRepository;
import com.jaytechwave.sacco.modules.obligations.domain.repository.SavingsObligationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ObligationService {

    private final SavingsObligationRepository       obligationRepository;
    private final SavingsObligationPeriodRepository periodRepository;
    private final MemberRepository                  memberRepository;
    private final ObligationPeriodService           periodService;
    private final PenaltyRepository                 penaltyRepository;

    // ── Staff: create ────────────────────────────────────────────────────────

    @Transactional
    public ObligationResponse createObligation(CreateObligationRequest request) {
        memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + request.getMemberId()));

        SavingsObligation obligation = SavingsObligation.builder()
                .memberId(request.getMemberId())
                .frequency(request.getFrequency())
                .amountDue(request.getAmountDue())
                .startDate(request.getStartDate())
                .graceDays(request.getGraceDays())
                .status(ObligationStatus.ACTIVE)
                .build();

        SavingsObligation saved = obligationRepository.save(obligation);
        log.info("Created savings obligation {} for member {} ({} @ {})",
                saved.getId(), saved.getMemberId(), saved.getFrequency(), saved.getAmountDue());
        return ObligationResponse.from(saved);
    }

    // ── Staff: edit obligation terms ──────────────────────────────────────────

    @Transactional
    public ObligationResponse updateObligation(UUID id, UpdateObligationRequest request) {
        SavingsObligation obligation = obligationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Obligation not found: " + id));

        if (request.amountDue() != null) obligation.setAmountDue(request.amountDue());
        if (request.startDate() != null) obligation.setStartDate(request.startDate());
        if (request.graceDays() != null) obligation.setGraceDays(request.graceDays());

        SavingsObligation saved = obligationRepository.save(obligation);
        log.info("Updated obligation {} — amountDue={}, startDate={}, graceDays={}",
                id, obligation.getAmountDue(), obligation.getStartDate(), obligation.getGraceDays());
        return ObligationResponse.from(saved);
    }

    // ── Staff: update status (pause / resume) ─────────────────────────────────

    @Transactional
    public ObligationResponse updateStatus(UUID obligationId, UpdateObligationStatusRequest request) {
        SavingsObligation obligation = obligationRepository.findById(obligationId)
                .orElseThrow(() -> new IllegalArgumentException("Obligation not found: " + obligationId));
        obligation.setStatus(request.getStatus());
        return ObligationResponse.from(obligationRepository.save(obligation));
    }

    // ── Staff: lookup by member ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ObligationResponse> getObligationsByMemberId(UUID memberId) {
        return obligationRepository.findByMemberId(memberId).stream()
                .map(ObligationResponse::from)
                .collect(Collectors.toList());
    }

    // ── Staff: compliance report ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ObligationComplianceEntry> getComplianceReport(Pageable pageable) {
        List<Object[]> overdueSummary = periodRepository.findOverdueSummaryPerMember();
        Map<UUID, Object[]> summaryMap = overdueSummary.stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> row));

        List<SavingsObligation> allActive = obligationRepository.findByStatus(ObligationStatus.ACTIVE);
        List<ObligationComplianceEntry> entries = new ArrayList<>();

        for (SavingsObligation obligation : allActive) {
            Object[] summary = summaryMap.get(obligation.getMemberId());
            long overdueCount    = summary != null ? ((Number) summary[1]).longValue() : 0L;
            BigDecimal shortfall = summary != null ? (BigDecimal) summary[2] : BigDecimal.ZERO;

            Member member = memberRepository.findById(obligation.getMemberId()).orElse(null);
            String memberNumber = member != null ? member.getMemberNumber() : "Unknown";
            String memberName   = member != null
                    ? member.getUser().getFirstName() + " " + member.getUser().getLastName()
                    : "Unknown";

            // Sum open savings penalties for this member
            BigDecimal totalPenalties = penaltyRepository
                    .findByMemberIdAndStatus(obligation.getMemberId(), PenaltyStatus.OPEN)
                    .stream()
                    .filter(p -> "SAVINGS_OBLIGATION".equals(p.getReferenceType()))
                    .map(p -> p.getOutstandingAmount())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            entries.add(ObligationComplianceEntry.builder()
                    .memberId(obligation.getMemberId())
                    .memberNumber(memberNumber)
                    .memberName(memberName)
                    .frequency(obligation.getFrequency())
                    .amountDue(obligation.getAmountDue())
                    .totalOverduePeriods(overdueCount)
                    .totalShortfall(shortfall != null ? shortfall : BigDecimal.ZERO)
                    .totalPenalties(totalPenalties)
                    .worstStatus(overdueCount > 0 ? PeriodStatus.OVERDUE : PeriodStatus.DUE)
                    .build());
        }

        int start = (int) pageable.getOffset();
        int end   = Math.min(start + pageable.getPageSize(), entries.size());
        List<ObligationComplianceEntry> page = start < entries.size() ? entries.subList(start, end) : List.of();
        return new PageImpl<>(page, pageable, entries.size());
    }

    // ── Member: my obligations ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ObligationResponse> getMyObligations(UUID memberId) {
        List<SavingsObligation> obligations = obligationRepository.findByMemberIdAndStatus(memberId, ObligationStatus.ACTIVE);
        List<ObligationResponse> responses  = new ArrayList<>();

        for (SavingsObligation obligation : obligations) {
            ObligationResponse response = ObligationResponse.from(obligation);
            LocalDate periodStart = currentPeriodStart(obligation);
            periodRepository.findByObligationIdAndPeriodStart(obligation.getId(), periodStart)
                    .ifPresent(p -> {
                        ObligationPeriodResponse pr = ObligationPeriodResponse.from(p);
                        // Enrich with penalty data and UPCOMING/DUE computed status
                        periodService.enrich(pr, true);
                        response.setCurrentPeriod(pr);
                    });
            responses.add(response);
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public Page<ObligationPeriodResponse> getMyHistory(UUID memberId, Pageable pageable) {
        List<SavingsObligation> obligations = obligationRepository.findByMemberId(memberId);
        LocalDate today = LocalDate.now(com.jaytechwave.sacco.modules.core.util.SaccoDateUtils.NAIROBI);
        List<ObligationPeriodResponse> all = obligations.stream()
                .flatMap(o -> {
                    LocalDate currentStart = currentPeriodStart(o);
                    return periodRepository.findByObligationId(o.getId()).stream()
                            .sorted((a, b) -> b.getPeriodStart().compareTo(a.getPeriodStart()))
                            .map(p -> periodService.enrich(ObligationPeriodResponse.from(p),
                                    p.getPeriodStart().isEqual(currentStart)));
                })
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end   = Math.min(start + pageable.getPageSize(), all.size());
        return new PageImpl<>(start < all.size() ? all.subList(start, end) : List.of(), pageable, all.size());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private LocalDate currentPeriodStart(SavingsObligation obligation) {
        LocalDate today = LocalDate.now();
        LocalDate start = obligation.getStartDate();

        if (today.isBefore(start)) return start;

        if (obligation.getFrequency() == ObligationFrequency.MONTHLY) {
            long months = ChronoUnit.MONTHS.between(start, today);
            LocalDate calcStart = start.plusMonths(months);
            return calcStart.isAfter(today) ? calcStart.minusMonths(1) : calcStart;
        } else {
            long weeks = ChronoUnit.WEEKS.between(start, today);
            LocalDate calcStart = start.plusWeeks(weeks);
            return calcStart.isAfter(today) ? calcStart.minusWeeks(1) : calcStart;
        }
    }
}