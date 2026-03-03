package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.*;
import com.jaytechwave.sacco.modules.loans.domain.entity.*;
import com.jaytechwave.sacco.modules.loans.domain.repository.*;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanApplicationService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanProductRepository loanProductRepository;
    private final UserRepository userRepository;
    private final PaymentService paymentService;

    @Transactional
    public LoanApplicationResponse createApplication(CreateLoanApplicationRequest request, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getMember() == null) {
            throw new IllegalStateException("Only registered members can apply for loans.");
        }

        LoanProduct product = loanProductRepository.findById(request.productId())
                .orElseThrow(() -> new IllegalArgumentException("Loan product not found"));

        if (!product.getIsActive()) {
            throw new IllegalStateException("Selected loan product is not active.");
        }

        LoanApplication application = LoanApplication.builder()
                .memberId(user.getMember().getId())
                .loanProduct(product)
                .principalAmount(request.principalAmount())
                .applicationFee(product.getApplicationFee())
                .applicationFeePaid(false)
                .status(LoanStatus.PENDING_FEE)
                .purpose(request.purpose())
                .build();

        application = loanApplicationRepository.save(application);
        return mapToResponse(application);
    }

    @Transactional
    public InitiateStkResponse initiateFeePayment(UUID applicationId, PayLoanFeeRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();

        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Loan application not found"));

        if (!application.getMemberId().equals(user.getMember().getId())) {
            throw new IllegalStateException("You can only pay fees for your own applications.");
        }

        if (application.getStatus() != LoanStatus.PENDING_FEE || application.getApplicationFeePaid()) {
            throw new IllegalStateException("This application does not require a fee payment right now.");
        }

        // Generate unique reference linking to this exact application
        String reference = "LNFEE-" + application.getId().toString();

        return paymentService.initiateMpesaStkPush(
                new InitiateStkRequest(request.phoneNumber(), application.getApplicationFee(), reference),
                user.getMember().getId()
        );
    }

    private LoanApplicationResponse mapToResponse(LoanApplication app) {
        return new LoanApplicationResponse(
                app.getId(), app.getMemberId(), app.getLoanProduct().getId(),
                app.getLoanProduct().getName(), app.getPrincipalAmount(),
                app.getApplicationFee(), app.getApplicationFeePaid(),
                app.getStatus().name(), app.getPurpose(), app.getCreatedAt()
        );
    }
}