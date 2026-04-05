package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs;
import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.*;
import com.jaytechwave.sacco.modules.loans.domain.entity.*;
import com.jaytechwave.sacco.modules.loans.domain.repository.*;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanApplicationService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanProductRepository loanProductRepository;
    private final LoanGuarantorRepository loanGuarantorRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final PaymentService paymentService;
    private final JournalEntryService journalEntryService;
    private final LoanScheduleService loanScheduleService;
    private final SecurityAuditService securityAuditService;
    private final LoanScheduleItemRepository scheduleItemRepository;
    private final JdbcTemplate jdbcTemplate; // ← ADDED: needed for created_at backdating

    @Transactional
    public LoanApplicationResponse createApplication(CreateLoanApplicationRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        if (user.getMember() == null) throw new IllegalStateException("Only members can apply.");

        LoanProduct product = loanProductRepository.findById(request.productId()).orElseThrow();
        if (!product.getIsActive()) throw new IllegalStateException("Product is not active.");

        LoanApplication application = LoanApplication.builder()
                .memberId(user.getMember().getId())
                .loanProduct(product)
                .principalAmount(request.principalAmount())
                .applicationFee(product.getApplicationFee())
                .applicationFeePaid(false)
                .status(LoanStatus.PENDING_FEE)
                .purpose(request.purpose())
                .referenceNotes(request.referenceNotes())
                .build();

        return mapToResponse(loanApplicationRepository.save(application));
    }

    @Transactional
    public InitiateStkResponse initiateFeePayment(UUID applicationId, PayLoanFeeRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId).orElseThrow();

        if (!app.getMemberId().equals(user.getMember().getId())) throw new IllegalStateException("Not authorized.");
        if (app.getStatus() != LoanStatus.PENDING_FEE || app.getApplicationFeePaid()) {
            throw new IllegalStateException("Fee not required right now.");
        }

        String reference = "LNFEE-" + app.getId().toString();
        return paymentService.initiateMpesaStkPush(
                new InitiateStkRequest(request.phoneNumber(), app.getApplicationFee(), reference),
                user.getMember().getId()
        );
    }

    @Transactional
    public GuarantorResponse addGuarantor(UUID applicationId, AddGuarantorRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId).orElseThrow();

        if (!app.getMemberId().equals(user.getMember().getId())) throw new IllegalStateException("Not authorized.");
        if (app.getStatus() != LoanStatus.PENDING_GUARANTORS) throw new IllegalStateException("Not accepting guarantors right now.");

        Member guarantorMember = memberRepository.findByMemberNumber(request.memberNumber())
                .orElseThrow(() -> new IllegalArgumentException("Member number not found."));

        if (guarantorMember.getId().equals(user.getMember().getId())) {
            throw new IllegalStateException("You cannot guarantee your own loan.");
        }

        boolean exists = loanGuarantorRepository.findByLoanApplicationId(applicationId).stream()
                .anyMatch(g -> g.getGuarantorMemberId().equals(guarantorMember.getId()));
        if (exists) throw new IllegalStateException("This member is already a guarantor.");

        LoanGuarantor guarantor = LoanGuarantor.builder()
                .loanApplication(app)
                .guarantorMemberId(guarantorMember.getId())
                .guaranteedAmount(request.guaranteedAmount())
                .status(GuarantorStatus.PENDING)
                .build();

        guarantor = loanGuarantorRepository.save(guarantor);
        return mapToGuarantorResponse(guarantor, guarantorMember);
    }

    @Transactional
    public void removeGuarantor(UUID applicationId, UUID guarantorId, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId).orElseThrow();

        if (!app.getMemberId().equals(user.getMember().getId())) throw new IllegalStateException("Not authorized.");
        if (app.getStatus() != LoanStatus.PENDING_GUARANTORS) throw new IllegalStateException("Cannot modify guarantors right now.");

        LoanGuarantor guarantor = loanGuarantorRepository.findById(guarantorId).orElseThrow();
        if (!guarantor.getLoanApplication().getId().equals(applicationId)) {
            throw new IllegalStateException("Guarantor does not belong to this application.");
        }

        loanGuarantorRepository.delete(guarantor);
    }

    @Transactional(readOnly = true)
    public List<GuarantorResponse> getGuarantors(UUID applicationId) {
        return loanGuarantorRepository.findByLoanApplicationId(applicationId).stream()
                .map(g -> {
                    Member m = memberRepository.findById(g.getGuarantorMemberId()).orElseThrow();
                    return mapToGuarantorResponse(g, m);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void submitApplication(UUID applicationId, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId).orElseThrow();

        if (!app.getMemberId().equals(user.getMember().getId())) throw new IllegalStateException("Not authorized.");
        if (app.getStatus() != LoanStatus.PENDING_GUARANTORS) throw new IllegalStateException("Application is not in a valid state to submit.");

        List<LoanGuarantor> guarantors = loanGuarantorRepository.findByLoanApplicationId(applicationId);
        if (guarantors.isEmpty()) {
            throw new IllegalStateException("You must add at least one guarantor before submitting.");
        }

        app.setStatus(LoanStatus.PENDING_VERIFICATION);
        loanApplicationRepository.save(app);

        securityAuditService.logEvent(
                "LOAN_APPLICATION_SUBMITTED",
                app.getId().toString(),
                "Loan application submitted for KES " + app.getPrincipalAmount() + " — product: " + app.getLoanProduct().getName()
        );
    }

    @Transactional(readOnly = true)
    public Page<LoanApplicationResponse> getAllApplications(Pageable pageable) {
        return loanApplicationRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<LoanApplicationResponse> getApplicationsByStatus(LoanStatus status, Pageable pageable) {
        return loanApplicationRepository.findByStatus(status, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<LoanApplicationResponse> getMyApplications(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        if (user.getMember() == null) return List.of();

        return loanApplicationRepository.findByMemberIdOrderByCreatedAtDesc(user.getMember().getId())
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public LoanApplicationResponse verifyApplication(UUID applicationId, ReviewLoanRequest request, String email) {
        User officer = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (app.getStatus() != LoanStatus.PENDING_VERIFICATION) {
            throw new IllegalStateException("Application is not in the Verification queue.");
        }

        app.setStatus(LoanStatus.PENDING_APPROVAL);
        app.setVerifiedBy(officer.getId());
        app.setVerifiedAt(java.time.LocalDateTime.now());
        app.setVerificationNotes(request.notes());

        LoanApplicationResponse response = mapToResponse(loanApplicationRepository.save(app));

        securityAuditService.logEvent(
                "LOAN_VERIFIED",
                app.getId().toString(),
                "Loan of KES " + app.getPrincipalAmount() + " verified by " + email
        );

        return response;
    }

    @Transactional
    public LoanApplicationResponse approveApplication(UUID applicationId, ReviewLoanRequest request, String email) {
        User committeeMember = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (app.getStatus() != LoanStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Application is not in the Committee Approval queue.");
        }

        app.setStatus(LoanStatus.APPROVED);
        app.setCommitteeApprovedBy(committeeMember.getId());
        app.setCommitteeApprovedAt(java.time.LocalDateTime.now());
        app.setCommitteeNotes(request.notes());

        LoanApplicationResponse response = mapToResponse(loanApplicationRepository.save(app));

        securityAuditService.logEvent(
                "LOAN_COMMITTEE_APPROVED",
                app.getId().toString(),
                "Loan of KES " + app.getPrincipalAmount() + " committee-approved by " + email
        );

        return response;
    }

    @Transactional
    public LoanApplicationResponse rejectApplication(UUID applicationId, ReviewLoanRequest request, String email) {
        User officer = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (app.getStatus() == LoanStatus.PENDING_VERIFICATION) {
            app.setVerifiedBy(officer.getId());
            app.setVerifiedAt(java.time.LocalDateTime.now());
            app.setVerificationNotes(request.notes());
        } else if (app.getStatus() == LoanStatus.PENDING_APPROVAL) {
            app.setCommitteeApprovedBy(officer.getId());
            app.setCommitteeApprovedAt(java.time.LocalDateTime.now());
            app.setCommitteeNotes(request.notes());
        } else {
            throw new IllegalStateException("Application cannot be rejected at this stage.");
        }

        app.setStatus(LoanStatus.REJECTED);
        LoanApplicationResponse response = mapToResponse(loanApplicationRepository.save(app));

        securityAuditService.logEvent(
                "LOAN_REJECTED",
                app.getId().toString(),
                "Loan of KES " + app.getPrincipalAmount() + " rejected by " + email + ". Notes: " + request.notes()
        );

        return response;
    }

    @Transactional
    public LoanApplicationResponse refinanceLoan(LoanDTOs.RefinanceRequest request, String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail).orElseThrow();

        // 1. Fetch Old Loan & Member
        LoanApplication oldLoan = loanApplicationRepository.findById(request.oldLoanId())
                .orElseThrow(() -> new IllegalArgumentException("Old loan not found"));

        if (oldLoan.getStatus() != LoanStatus.ACTIVE && oldLoan.getStatus() != LoanStatus.IN_GRACE) {
            throw new IllegalStateException("Only active loans can be refinanced.");
        }

        Member member = memberRepository.findById(oldLoan.getMemberId()).orElseThrow();

        // 2. Calculate exactly what is left to pay on the old loan (Principal + Interest)
        List<LoanScheduleItem> oldSchedule = scheduleItemRepository.findByLoanApplicationIdOrderByWeekNumberAsc(oldLoan.getId());
        BigDecimal oldLoanBalance = oldSchedule.stream()
                .filter(item -> item.getStatus() != LoanScheduleStatus.PAID)
                .map(item -> item.getTotalDue().subtract(item.getPrincipalPaid()).subtract(item.getInterestPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Explicitly define the business outcome of the old loan
        if (request.topUpAmount().compareTo(BigDecimal.ZERO) > 0) {
            oldLoan.setStatus(LoanStatus.REFINANCED);
        } else {
            oldLoan.setStatus(LoanStatus.RESTRUCTURED);
        }

        // 🟢 THE FIX (BENJAMIN'S BUG): Kill the Ghost Schedules!
        List<LoanScheduleItem> oldSchedulesToNeutralize = scheduleItemRepository.findByLoanApplicationIdOrderByWeekNumberAsc(oldLoan.getId());
        for (LoanScheduleItem item : oldSchedulesToNeutralize) {
            // If the schedule hasn't been paid, neutralize it so the cron job ignores it
            if (item.getStatus() != LoanScheduleStatus.PAID) {
                item.setStatus(LoanScheduleStatus.REPLACED);
            }
        }
        scheduleItemRepository.saveAll(oldSchedulesToNeutralize);

        loanApplicationRepository.save(oldLoan);

        // 4. Create the New Consolidated Loan
        LoanProduct product = loanProductRepository.findByName(request.loanProductCode()).orElseThrow();
        BigDecimal newPrincipal = oldLoanBalance.add(request.topUpAmount());

        LoanApplication newLoan = LoanApplication.builder()
                .memberId(member.getId())
                .loanProduct(product)
                .principalAmount(newPrincipal)
                .termWeeks(request.newTermWeeks())
                .status(LoanStatus.ACTIVE) // 🟢 THE FIX (CHARLES'S BUG): Ensure the new loan is ACTIVE
                .disbursedBy(admin.getId())
                .applicationFee(BigDecimal.ZERO)
                .applicationFeePaid(true)
                .referenceNotes(request.referenceNumber() != null ? "MIGRATION: " + request.referenceNumber() : null) // 🟢 COSMETIC FIX
                .disbursedAt(request.historicalDateOverride() != null ?
                        request.historicalDateOverride().atStartOfDay() : LocalDateTime.now())
                .build();

        newLoan = loanApplicationRepository.save(newLoan);

        // 5. Generate the new schedule
        loanScheduleService.generateWeeklySchedule(newLoan);

// 5a. 🚨 GRACE PERIOD FIX: Refinanced/restructured loans should NOT have a grace
//     period. The generateWeeklySchedule uses the product's grace period to push
//     the first due date forward. Shift it back immediately.
        int graceDays = product.getGracePeriodDays();
        if (graceDays > 0) {
            jdbcTemplate.update(
                    "UPDATE loan_schedule_items " +
                            "SET due_date = due_date - INTERVAL '" + graceDays + " days' " +
                            "WHERE loan_application_id = ?",
                    newLoan.getId());
            log.info("⚙️  Shifted schedule back {} days (grace period removed) for refinanced loan {}",
                    graceDays, newLoan.getId());
        }

        // 5b. SCHEDULE OVERRIDE: If interestOverride provided, rewrite schedule
        //     with the exact historical interest (e.g. 5% on top-up only)
        if (request.interestOverride() != null
                && request.interestOverride().compareTo(BigDecimal.ZERO) > 0) {

            int termWeeks = request.newTermWeeks();
            BigDecimal totalInterest = request.interestOverride();

            BigDecimal principalPerWeek = newPrincipal
                    .divide(BigDecimal.valueOf(termWeeks), 2, java.math.RoundingMode.HALF_UP);
            BigDecimal interestPerWeek = totalInterest
                    .divide(BigDecimal.valueOf(termWeeks), 2, java.math.RoundingMode.HALF_UP);

            BigDecimal principalAccumulated = BigDecimal.ZERO;
            BigDecimal interestAccumulated = BigDecimal.ZERO;

            List<LoanScheduleItem> items = scheduleItemRepository
                    .findByLoanApplicationIdOrderByWeekNumberAsc(newLoan.getId());

            for (int i = 0; i < items.size(); i++) {
                LoanScheduleItem item = items.get(i);
                boolean isLast = (i == items.size() - 1);

                BigDecimal p = isLast ? newPrincipal.subtract(principalAccumulated) : principalPerWeek;
                BigDecimal ir = isLast ? totalInterest.subtract(interestAccumulated) : interestPerWeek;

                item.setPrincipalDue(p);
                item.setInterestDue(ir);
                item.setTotalDue(p.add(ir));
                scheduleItemRepository.save(item);

                principalAccumulated = principalAccumulated.add(p);
                interestAccumulated = interestAccumulated.add(ir);
            }
            log.info("✅ Refinance schedule overridden. Principal={}, InterestOverride={}", newPrincipal, totalInterest);
        }

        // 5c. 🚨 TIME MACHINE: If a historical date was provided, backdate created_at AND disbursed_at on the
        //     new loan so the UI shows the correct "Disbursed On" date instead of today.
        //     @CreationTimestamp always writes the real wall-clock time — JDBC is the only way
        //     to override it after the fact.
        if (request.historicalDateOverride() != null) {
            Timestamp historicalTs = Timestamp.valueOf(
                    request.historicalDateOverride().atStartOfDay());
            jdbcTemplate.update(
                    "UPDATE loan_applications SET created_at = ?, updated_at = ?, disbursed_at = ? WHERE id = ?",
                    historicalTs, historicalTs, historicalTs, newLoan.getId());
            log.info("⏮️  Backdated new loan {} created_at & disbursed_at → {}", newLoan.getId(), request.historicalDateOverride());
        }

        // 6. Post Accounting (Net Cash)
        journalEntryService.postLoanRefinance(
                member.getId(),
                oldLoanBalance,
                newPrincipal,
                request.topUpAmount(), // The net cash disbursed
                request.referenceNumber()
        );

        // 7. Audit Logging
        securityAuditService.logEvent(
                "LOAN_REFINANCED",
                member.getMemberNumber(),
                "Refinanced Loan " + oldLoan.getId() + ". Old Balance: KES " + oldLoanBalance +
                        ", Top-Up: KES " + request.topUpAmount() + ", New Face Value: KES " + newPrincipal
        );

        return mapToResponse(newLoan);
    }

    @Transactional
    public LoanApplicationResponse disburseApplication(UUID applicationId, String email) {
        User treasurer = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (app.getStatus() != LoanStatus.APPROVED) {
            throw new IllegalStateException("Application must be strictly APPROVED by the Committee before disbursement.");
        }

        // FETCH MEMBER to match Savings pattern
        Member member = memberRepository.findById(app.getMemberId()).orElseThrow();
        String reference = (app.getReferenceNotes() != null && !app.getReferenceNotes().isBlank())
                ? app.getReferenceNotes()
                : "LNCASH-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        journalEntryService.postLoanDisbursement(
                app.getMemberId(),
                app.getPrincipalAmount(),
                reference
        );

        if (app.getLoanProduct().getGracePeriodDays() > 0) {
            app.setStatus(LoanStatus.IN_GRACE);
        } else {
            app.setStatus(LoanStatus.ACTIVE);
        }

        app.setDisbursedBy(treasurer.getId());
        app.setDisbursedAt(java.time.LocalDateTime.now());

        loanScheduleService.generateWeeklySchedule(app);

        LoanApplicationResponse response = mapToResponse(loanApplicationRepository.save(app));

        // EXACT SAVINGS FORMAT
        securityAuditService.logEvent(
                "LOAN_DISBURSED",
                member.getMemberNumber(), // Target: Sacco Member Number
                "Loan disbursement of KES " + app.getPrincipalAmount() + ". Ref: LNDIS-" + reference
        );

        return response;
    }

    // =================================================================================
    // MIGRATION BACKDOOR: Overloaded disbursement method that accepts a historical date
    // =================================================================================
    // =================================================================================
    // MIGRATION BACKDOOR: Overloaded disbursement method that accepts a historical date
    // =================================================================================
    @Transactional
    public LoanApplicationResponse disburseHistoricalApplication(UUID applicationId, String email, java.time.LocalDate backdateOverride) {
        User treasurer = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (app.getStatus() != LoanStatus.APPROVED) {
            throw new IllegalStateException("Application must be strictly APPROVED by the Committee before disbursement.");
        }

        // 1. FETCH MEMBER to match Savings pattern for the Audit Log target
        Member member = memberRepository.findById(app.getMemberId()).orElseThrow();
        String reference = (app.getReferenceNotes() != null && !app.getReferenceNotes().isBlank())
                ? app.getReferenceNotes()
                : "LNCASH-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 2. Post to Accounting
        // (JournalEntryService automatically prepends LNDIS- to this reference internally)
        journalEntryService.postLoanDisbursement(
                app.getMemberId(),
                app.getPrincipalAmount(),
                reference
        );

        // 3. For historical migrations, force them straight to ACTIVE
        app.setStatus(LoanStatus.ACTIVE);
        app.setDisbursedBy(treasurer.getId());

        // 🚨 THE MAGIC KEY: We use the provided historical date instead of LocalDateTime.now()
        app.setDisbursedAt(backdateOverride.atStartOfDay());

        // 4. The Schedule generator will now read the historical disbursedAt date!
        loanScheduleService.generateWeeklySchedule(app);

        LoanApplicationResponse response = mapToResponse(loanApplicationRepository.save(app));

        // 🟢 THE FIX: TIME MACHINE - Backdate the Loan Application's immutable created_at and disbursed_at timestamps
        Timestamp historicalTs = Timestamp.valueOf(backdateOverride.atStartOfDay());
        jdbcTemplate.update(
                "UPDATE loan_applications SET created_at = ?, updated_at = ?, disbursed_at = ? WHERE id = ?",
                historicalTs, historicalTs, historicalTs, app.getId());

        // 🟢 THE FIX: TIME MACHINE - Backdate the General Ledger Journal Entry!
        // We must update the accounting ledger so the statement picks up the correct historical date.
        jdbcTemplate.update(
                "UPDATE journal_entries SET transaction_date = ?, created_at = ?, updated_at = ? WHERE reference_number = ?",
                historicalTs, historicalTs, historicalTs, "LNDIS-" + reference);

        // 5. EXACT SAVINGS FORMAT for the Audit Log
        securityAuditService.logEvent(
                "LOAN_DISBURSED",
                member.getMemberNumber(), // 🚨 Target is now the Member Number!
                "Manual loan disbursement of KES " + app.getPrincipalAmount() + ". Ref: LNDIS-" + reference + " (Historical Date: " + backdateOverride + ")"
        );

        return response;
    }

    // --- MAPPERS ---

    private LoanApplicationResponse mapToResponse(LoanApplication application) {
        return new LoanApplicationResponse(
                application.getId(),
                application.getMemberId(),
                application.getLoanProduct().getId(),
                application.getLoanProduct().getName(),
                application.getTermWeeks(),
                application.getLoanProduct().getGracePeriodDays(),
                application.getPrincipalAmount(),
                application.getApplicationFee(),
                application.getApplicationFeePaid(),
                application.getStatus().name(),
                application.getPurpose(),
                application.getReferenceNotes(),
                application.getCreatedAt(),
                List.of() // Remove getGuarantors() call, or implement if needed
        );
    }

    private GuarantorResponse mapToGuarantorResponse(LoanGuarantor guarantor, Member member) {
        String fullName = member.getUser().getFirstName() + " " + member.getUser().getLastName();
        return new GuarantorResponse(
                guarantor.getId(), member.getId(), fullName,
                member.getMemberNumber(), guarantor.getGuaranteedAmount(),
                guarantor.getStatus().name()
        );
    }
}