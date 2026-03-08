package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.ArrearsSummaryResponse;
import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.LoanSummaryResponse;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleItem;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanScheduleStatus;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanScheduleItemRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
public class LoanReportingService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanScheduleItemRepository scheduleItemRepository;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;

    @Transactional(readOnly = true)
    public LoanSummaryResponse getMemberLoanSummary(UUID applicationId, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId).orElseThrow();

        if (!app.getMemberId().equals(user.getMember().getId())) {
            throw new IllegalStateException("Not authorized to view this loan.");
        }
        return calculateLoanSummary(app);
    }

    @Transactional(readOnly = true)
    public LoanSummaryResponse getStaffLoanSummary(UUID applicationId) {
        LoanApplication app = loanApplicationRepository.findById(applicationId).orElseThrow();
        return calculateLoanSummary(app);
    }

    // --- CORE CALCULATION ENGINE ---
    private LoanSummaryResponse calculateLoanSummary(LoanApplication app) {
        List<LoanScheduleItem> items = scheduleItemRepository.findByLoanApplicationIdOrderByWeekNumberAsc(app.getId());

        BigDecimal totalOutstanding = BigDecimal.ZERO;
        BigDecimal totalArrears = BigDecimal.ZERO;
        LoanScheduleItem nextDueItem = null;

        for (LoanScheduleItem item : items) {
            BigDecimal itemTotalPaid = item.getPrincipalPaid().add(item.getInterestPaid());
            BigDecimal itemBalance = item.getTotalDue().subtract(itemTotalPaid);

            if (itemBalance.compareTo(BigDecimal.ZERO) > 0) {
                totalOutstanding = totalOutstanding.add(itemBalance);
            }

            if (item.getStatus() == LoanScheduleStatus.OVERDUE) {
                totalArrears = totalArrears.add(itemBalance);
            }

            if (nextDueItem == null && (item.getStatus() == LoanScheduleStatus.DUE || item.getStatus() == LoanScheduleStatus.PENDING)) {
                nextDueItem = item;
            }
        }

        LocalDate nextDueDate = nextDueItem != null ? nextDueItem.getDueDate() : null;
        BigDecimal nextDueAmount = nextDueItem != null ? nextDueItem.getTotalDue().subtract(nextDueItem.getPrincipalPaid().add(nextDueItem.getInterestPaid())) : BigDecimal.ZERO;

        return new LoanSummaryResponse(
                app.getId(), app.getLoanProduct().getName(), app.getPrincipalAmount(),
                totalOutstanding, totalArrears, app.getPrepaymentBalance(),
                nextDueDate, nextDueAmount, app.getStatus().name()
        );
    }

    @Transactional(readOnly = true)
    public List<ArrearsSummaryResponse> getArrearsReport() {
        // Find all strictly overdue schedule items system-wide
        List<LoanScheduleItem> overdueItems = scheduleItemRepository.findByStatus(LoanScheduleStatus.OVERDUE);

        Map<LoanApplication, List<LoanScheduleItem>> grouped = overdueItems.stream()
                .collect(Collectors.groupingBy(LoanScheduleItem::getLoanApplication));

        List<ArrearsSummaryResponse> report = new ArrayList<>();

        for (Map.Entry<LoanApplication, List<LoanScheduleItem>> entry : grouped.entrySet()) {
            LoanApplication app = entry.getKey();
            List<LoanScheduleItem> appOverdueItems = entry.getValue();

            BigDecimal totalArrears = appOverdueItems.stream()
                    .map(item -> item.getTotalDue().subtract(item.getPrincipalPaid().add(item.getInterestPaid())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Calculate days in arrears based on the oldest missed payment
            LocalDate oldestDueDate = appOverdueItems.stream()
                    .map(LoanScheduleItem::getDueDate)
                    .min(LocalDate::compareTo)
                    .orElse(LocalDate.now());

            long daysInArrears = ChronoUnit.DAYS.between(oldestDueDate, LocalDate.now());

            Member member = memberRepository.findById(app.getMemberId()).orElseThrow();
            String memberName = member.getUser().getFirstName() + " " + member.getUser().getLastName();

            report.add(new ArrearsSummaryResponse(
                    app.getId(), member.getId(), memberName, member.getMemberNumber(),
                    daysInArrears, totalArrears
            ));
        }

        return report;
    }
}