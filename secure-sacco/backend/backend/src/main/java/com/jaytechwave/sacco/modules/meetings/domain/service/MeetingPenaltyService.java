package com.jaytechwave.sacco.modules.meetings.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.meetings.domain.entity.*;
import com.jaytechwave.sacco.modules.meetings.domain.repository.MeetingAttendanceRepository;
import com.jaytechwave.sacco.modules.penalties.domain.entity.*;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyAccrualRepository;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRepository;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Handles penalty generation for meetings in its own isolated transaction.
 *
 * <p><strong>Why a separate bean?</strong><br>
 * {@code MeetingService.completeMeeting()} is {@code @Transactional}. If penalty
 * generation fails and we call it from within the same transaction, Spring marks
 * the whole transaction as rollback-only — meaning even the meeting status update
 * gets rolled back, causing an {@code UnexpectedRollbackException} (500) even when
 * the meeting was correctly completed.</p>
 *
 * <p>By extracting to a separate Spring bean annotated with
 * {@code REQUIRES_NEW}, each call runs in its own independent transaction.
 * A penalty failure never contaminates the meeting completion transaction.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MeetingPenaltyService {

    private final MeetingAttendanceRepository attendanceRepository;
    private final PenaltyRepository           penaltyRepository;
    private final PenaltyRuleRepository        penaltyRuleRepository;
    private final PenaltyAccrualRepository     penaltyAccrualRepository;
    private final JournalEntryService          journalEntryService;
    private final SecurityAuditService         securityAuditService;

    /**
     * Generates absence/lateness penalties for all attendance records of the
     * given meeting. Runs in a completely separate transaction ({@code REQUIRES_NEW})
     * so a penalty failure NEVER rolls back the meeting completion.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void generatePenalties(Meeting meeting) {
        PenaltyRule late30Rule  = penaltyRuleRepository.findByCode("MEETING_LATE_30")
                .filter(PenaltyRule::getIsActive).orElse(null);
        PenaltyRule late120Rule = penaltyRuleRepository.findByCode("MEETING_LATE_120")
                .filter(PenaltyRule::getIsActive).orElse(null);
        PenaltyRule absentRule  = penaltyRuleRepository.findByCode("MEETING_ABSENT")
                .filter(PenaltyRule::getIsActive).orElse(null);

        List<MeetingAttendance> attendance = attendanceRepository.findByMeetingId(meeting.getId());

        if (attendance.isEmpty()) {
            log.warn("generatePenalties: No attendance records found for meeting {} — no penalties created.",
                    meeting.getId());
            return;
        }

        int penaltiesCreated = 0;

        for (MeetingAttendance record : attendance) {
            try {
                if (record.getStatus() == AttendanceStatus.ABSENT && absentRule != null) {
                    createPenalty(meeting, record.getMemberId(), absentRule, "MEETING_ABSENT");
                    penaltiesCreated++;

                } else if (record.getStatus() == AttendanceStatus.LATE) {
                    // Use arrivedAt (set by self-check-in or provided by staff).
                    // recordedAt is admin metadata — never used for penalty calculation.
                    LocalDateTime arrivedAt = record.getArrivedAt();

                    if (arrivedAt == null) {
                        // Staff marked LATE but didn't provide arrival time.
                        // Apply the minimum tier (LATE_30) as a safe, fair default.
                        if (late30Rule != null) {
                            createPenalty(meeting, record.getMemberId(), late30Rule, "MEETING_LATE_30");
                            penaltiesCreated++;
                        }
                    } else {
                        long minutesLate = java.time.Duration.between(meeting.getStartAt(), arrivedAt).toMinutes();
                        if (minutesLate >= 120 && late120Rule != null) {
                            createPenalty(meeting, record.getMemberId(), late120Rule, "MEETING_LATE_120");
                            penaltiesCreated++;
                        } else if (late30Rule != null) {
                            createPenalty(meeting, record.getMemberId(), late30Rule, "MEETING_LATE_30");
                            penaltiesCreated++;
                        }
                    }
                }
            } catch (Exception e) {
                // Log individual failures — they do NOT roll back this transaction
                // because each createPenalty call is within the same REQUIRES_NEW transaction.
                // If an individual penalty fails here, that member's penalty is skipped but
                // all others proceed normally.
                log.error("generatePenalties: Failed for member {} in meeting {}: {}",
                        record.getMemberId(), meeting.getId(), e.getMessage(), e);
            }
        }

        log.info("generatePenalties: {} penalty/ies created for meeting '{}'.",
                penaltiesCreated, meeting.getTitle());
    }

    private void createPenalty(Meeting meeting, UUID memberId, PenaltyRule rule, String ruleCode) {
        String idempotencyKey = ruleCode + "-" + meeting.getId() + "-" + memberId;

        if (penaltyAccrualRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.info("createPenalty: Idempotency hit — {} already generated for member {} in meeting {}",
                    ruleCode, memberId, meeting.getId());
            return;
        }

        BigDecimal amount = rule.getBaseAmountValue();

        Penalty penalty = Penalty.builder()
                .memberId(memberId)
                .referenceType("MEETING")
                .referenceId(meeting.getId())
                .penaltyRule(rule)
                .originalAmount(amount)
                .outstandingAmount(amount)
                .status(PenaltyStatus.OPEN)
                .build();

        UUID accrualId = UUID.randomUUID();
        PenaltyAccrual accrual = PenaltyAccrual.builder()
                .id(accrualId)
                .accrualKind(AccrualKind.PRINCIPAL)
                .amount(amount)
                .accruedAt(LocalDateTime.now())
                .idempotencyKey(idempotencyKey)
                .journalReference("PENC-" + accrualId)
                .build();

        penalty.addAccrual(accrual);
        penaltyRepository.save(penalty);

        journalEntryService.postPenaltyCreation(memberId, amount, accrualId.toString());

        securityAuditService.logEvent(
                "PENALTY_CREATED",
                "PENALTY-" + penalty.getId(),
                ruleCode + " penalty of KES " + amount + " raised for member " + memberId
                        + " from meeting '" + meeting.getTitle() + "'"
        );

        log.info("createPenalty: {} — KES {} for member {}", ruleCode, amount, memberId);
    }
}