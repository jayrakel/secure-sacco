package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public LoanApplicationResponse disburseApplication(UUID applicationId, String email) {
        User treasurer = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (app.getStatus() != LoanStatus.APPROVED) {
            throw new IllegalStateException("Application must be strictly APPROVED by the Committee before disbursement.");
        }

        journalEntryService.postLoanDisbursement(
                app.getMemberId(),
                app.getPrincipalAmount(),
                app.getId().toString()
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

        securityAuditService.logEvent(
                "LOAN_DISBURSED",
                app.getId().toString(),
                "KES " + app.getPrincipalAmount() + " disbursed by " + email + " to member " + app.getMemberId()
        );

        return response;
    }

    // --- MAPPERS ---

    private LoanApplicationResponse mapToResponse(LoanApplication app) {
        List<GuarantorResponse> guarantors = loanGuarantorRepository
                .findByLoanApplicationId(app.getId())
                .stream()
                .map(g -> {
                    Member m = memberRepository.findById(g.getGuarantorMemberId()).orElseThrow();
                    return mapToGuarantorResponse(g, m);
                })
                .collect(Collectors.toList());

        return new LoanApplicationResponse(
                app.getId(), app.getMemberId(), app.getLoanProduct().getId(),
                app.getLoanProduct().getName(), app.getLoanProduct().getTermWeeks(),
                app.getLoanProduct().getGracePeriodDays(),
                app.getPrincipalAmount(),
                app.getApplicationFee(), app.getApplicationFeePaid(),
                app.getStatus().name(), app.getPurpose(), app.getCreatedAt(),
                guarantors
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