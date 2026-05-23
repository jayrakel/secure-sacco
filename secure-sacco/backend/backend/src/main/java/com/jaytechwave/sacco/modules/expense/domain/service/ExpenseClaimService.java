package com.jaytechwave.sacco.modules.expense.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.expense.api.dto.ExpenseClaimDTOs.*;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaim;
import com.jaytechwave.sacco.modules.expense.domain.entity.ExpenseClaimStatus;
import com.jaytechwave.sacco.modules.expense.domain.repository.ExpenseClaimRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for the Member Expense Reimbursement Module (SAC-220).
 *
 * <p><strong>Golden Rule:</strong> Only APPROVED claims affect financial records.
 * Every approval triggers a double-entry journal post via {@link JournalEntryService}.
 * Every state change is written to the {@link SecurityAuditService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExpenseClaimService {

    private final ExpenseClaimRepository expenseClaimRepository;
    private final MemberRepository       memberRepository;
    private final UserRepository         userRepository;
    private final JournalEntryService    journalEntryService;
    private final SecurityAuditService   securityAuditService;

    // ── Staff: Submit a claim on behalf of a member ───────────────────────────

    /**
     * Submits a new expense claim. Called by staff (Treasurer/Admin).
     * The claim starts in PENDING state — no GL entry is created yet.
     */
    @Transactional
    public ExpenseClaimResponse submitClaim(SubmitExpenseClaimRequest request, String actorEmail) {
        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + request.memberId()));

        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new IllegalStateException("Expense claims can only be submitted for ACTIVE members.");
        }

        ExpenseClaim claim = ExpenseClaim.builder()
                .memberId(member.getId())
                .amount(request.amount())
                .description(request.description())
                .receiptReference(request.receiptReference())
                .status(ExpenseClaimStatus.PENDING)
                .build();

        claim = expenseClaimRepository.save(claim);

        securityAuditService.logEvent(
                "EXPENSE_CLAIM_SUBMITTED",
                "CLAIM-" + claim.getId(),
                String.format("Expense claim submitted for member %s by %s. Amount: KES %s. Desc: %s",
                        member.getMemberNumber(), actorEmail, request.amount(), request.description())
        );

        log.info("SAC-220: Expense claim {} submitted for member {} by {}", claim.getId(), member.getMemberNumber(), actorEmail);
        return toResponse(claim, member);
    }

    // ── Member: View my own claims ────────────────────────────────────────────

    /**
     * Returns all claims submitted for the authenticated member, newest first.
     */
    @Transactional(readOnly = true)
    public List<ExpenseClaimResponse> getMyClaims(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getMember() == null) {
            throw new IllegalStateException("User is not a registered member.");
        }

        Member member = user.getMember();
        return expenseClaimRepository.findByMemberIdOrderByCreatedAtDesc(member.getId())
                .stream()
                .map(claim -> toResponse(claim, member))
                .collect(Collectors.toList());
    }

    // ── Staff: View all claims ─────────────────────────────────────────────────

    /**
     * Returns all claims across all members, newest first. Used by the staff management page.
     */
    @Transactional(readOnly = true)
    public List<ExpenseClaimResponse> getAllClaims() {
        return expenseClaimRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(claim -> {
                    Member member = memberRepository.findById(claim.getMemberId()).orElse(null);
                    return toResponse(claim, member);
                })
                .collect(Collectors.toList());
    }

    // ── Staff: Approve or reject a claim ──────────────────────────────────────

    /**
     * Reviews a PENDING claim — approves or rejects it.
     *
     * <p><strong>On APPROVED:</strong> posts an immutable GL journal entry:
     * <pre>
     *   DR 5360 Member Expense Reimbursement (EXPENSE)
     *   CR 2190 Member Reimbursement Payable  (LIABILITY)
     * </pre>
     *
     * <p><strong>On REJECTED:</strong> no financial impact; rejectionReason is mandatory.
     */
    @Transactional
    public ExpenseClaimResponse reviewClaim(UUID claimId,
                                            ReviewExpenseClaimRequest request,
                                            String actorEmail,
                                            String ipAddress) {

        ExpenseClaim claim = expenseClaimRepository.findById(claimId)
                .orElseThrow(() -> new IllegalArgumentException("Expense claim not found: " + claimId));

        if (claim.getStatus() != ExpenseClaimStatus.PENDING) {
            throw new IllegalStateException(
                    "Cannot review claim " + claimId + " — current status is " + claim.getStatus()
                            + ". Only PENDING claims can be reviewed.");
        }

        // Validate rejection reason is provided when rejecting
        if (Boolean.FALSE.equals(request.approved())) {
            if (request.rejectionReason() == null || request.rejectionReason().isBlank()) {
                throw new IllegalArgumentException("Rejection reason is required when rejecting a claim.");
            }
        }

        User reviewer = userRepository.findByEmail(actorEmail)
                .orElseThrow(() -> new IllegalArgumentException("Reviewer user not found"));

        claim.setReviewedByUserId(reviewer.getId());
        claim.setReviewedAt(ZonedDateTime.now());

        Member member = memberRepository.findById(claim.getMemberId())
                .orElseThrow(() -> new IllegalStateException("Member not found for claim: " + claimId));

        if (Boolean.TRUE.equals(request.approved())) {
            // ── APPROVED: post GL entry, then mark claim ─────────────────────
            String journalRef = "EXP-" + claim.getId();

            journalEntryService.postExpenseReimbursementClaim(
                    member.getId(), claim.getAmount(), claim.getId().toString()
            );

            claim.setStatus(ExpenseClaimStatus.APPROVED);
            claim.setJournalReference(journalRef);

            securityAuditService.logEventWithActorAndIp(
                    actorEmail,
                    "EXPENSE_CLAIM_APPROVED",
                    "CLAIM-" + claim.getId(),
                    ipAddress,
                    String.format("Approved expense claim for member %s. Amount: KES %s. GL Ref: %s",
                            member.getMemberNumber(), claim.getAmount(), journalRef)
            );

            log.info("SAC-220: Claim {} APPROVED by {}. GL entry posted: {}", claimId, actorEmail, journalRef);

        } else {
            // ── REJECTED: no GL entry ─────────────────────────────────────────
            claim.setStatus(ExpenseClaimStatus.REJECTED);
            claim.setRejectionReason(request.rejectionReason());

            securityAuditService.logEventWithActorAndIp(
                    actorEmail,
                    "EXPENSE_CLAIM_REJECTED",
                    "CLAIM-" + claim.getId(),
                    ipAddress,
                    String.format("Rejected expense claim for member %s. Amount: KES %s. Reason: %s",
                            member.getMemberNumber(), claim.getAmount(), request.rejectionReason())
            );

            log.info("SAC-220: Claim {} REJECTED by {}. Reason: {}", claimId, actorEmail, request.rejectionReason());
        }

        claim = expenseClaimRepository.save(claim);
        return toResponse(claim, member);
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private ExpenseClaimResponse toResponse(ExpenseClaim claim, Member member) {
        String memberNumber = member != null ? member.getMemberNumber() : "Unknown";
        String memberName   = member != null
                ? member.getFirstName() + " " + member.getLastName()
                : "Unknown";

        return new ExpenseClaimResponse(
                claim.getId(),
                claim.getMemberId(),
                memberNumber,
                memberName,
                claim.getAmount(),
                claim.getDescription(),
                claim.getReceiptReference(),
                claim.getStatus().name(),
                claim.getRejectionReason(),
                claim.getReviewedByUserId(),
                claim.getReviewedAt(),
                claim.getJournalReference(),
                claim.getCreatedAt()
        );
    }
}
