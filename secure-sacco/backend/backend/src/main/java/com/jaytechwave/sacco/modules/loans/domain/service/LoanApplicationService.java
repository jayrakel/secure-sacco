package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    // --- APPLICATION CREATION & FEES ---

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

    // --- GUARANTOR CAPTURE ---

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

        // Duplicate Check
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

        // Advance to Tier 1 Verification (Loans Officer Queue)
        app.setStatus(LoanStatus.PENDING_VERIFICATION);
        loanApplicationRepository.save(app);
    }

    @Transactional(readOnly = true)
    public List<LoanApplicationResponse> getApplicationsByStatus(LoanStatus status) {
        return loanApplicationRepository.findByStatus(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
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

        // Advance to Tier 2 (Committee Review)
        app.setStatus(LoanStatus.PENDING_APPROVAL);
        app.setVerifiedBy(officer.getId());
        app.setVerifiedAt(java.time.LocalDateTime.now());
        app.setVerificationNotes(request.notes());

        return mapToResponse(loanApplicationRepository.save(app));
    }

    @Transactional
    public LoanApplicationResponse approveApplication(UUID applicationId, ReviewLoanRequest request, String email) {
        User committeeMember = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (app.getStatus() != LoanStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Application is not in the Committee Approval queue.");
        }

        // Advance to APPROVED (Ready for Treasurer to Disburse)
        app.setStatus(LoanStatus.APPROVED);
        app.setCommitteeApprovedBy(committeeMember.getId());
        app.setCommitteeApprovedAt(java.time.LocalDateTime.now());
        app.setCommitteeNotes(request.notes());

        return mapToResponse(loanApplicationRepository.save(app));
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
        return mapToResponse(loanApplicationRepository.save(app));
    }

    @Transactional
    public LoanApplicationResponse disburseApplication(UUID applicationId, String email) {
        User treasurer = userRepository.findByEmail(email).orElseThrow();
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (app.getStatus() != LoanStatus.APPROVED) {
            throw new IllegalStateException("Application must be strictly APPROVED by the Committee before disbursement.");
        }

        // 1. Post the Immutable GL Journal
        journalEntryService.postLoanDisbursement(
                app.getMemberId(),
                app.getPrincipalAmount(),
                app.getId().toString()
        );

        // 2. Advance Status & Audit Timestamps
        if (app.getLoanProduct().getGracePeriodDays() > 0) {
            app.setStatus(LoanStatus.IN_GRACE);
        } else {
            app.setStatus(LoanStatus.ACTIVE);
        }

        app.setDisbursedBy(treasurer.getId());
        app.setDisbursedAt(java.time.LocalDateTime.now());

        loanScheduleService.generateWeeklySchedule(app);

        return mapToResponse(loanApplicationRepository.save(app));
    }

    // --- MAPPERS ---

    private LoanApplicationResponse mapToResponse(LoanApplication app) {
        return new LoanApplicationResponse(
                app.getId(), app.getMemberId(), app.getLoanProduct().getId(),
                app.getLoanProduct().getName(), app.getPrincipalAmount(),
                app.getApplicationFee(), app.getApplicationFeePaid(),
                app.getStatus().name(), app.getPurpose(), app.getCreatedAt()
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