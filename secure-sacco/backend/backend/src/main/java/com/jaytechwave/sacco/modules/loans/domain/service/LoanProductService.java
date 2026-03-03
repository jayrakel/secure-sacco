package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.LoanProductRequest;
import com.jaytechwave.sacco.modules.loans.api.dto.LoanDTOs.LoanProductResponse;
import com.jaytechwave.sacco.modules.loans.domain.entity.InterestModel;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanProduct;
import com.jaytechwave.sacco.modules.loans.domain.entity.RepaymentFrequency;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LoanProductService {

    private final LoanProductRepository loanProductRepository;

    @Transactional
    public LoanProductResponse createLoanProduct(LoanProductRequest request) {
        LoanProduct product = LoanProduct.builder()
                .name(request.name())
                .description(request.description())
                .repaymentFrequency(RepaymentFrequency.valueOf(request.repaymentFrequency()))
                .termWeeks(request.termWeeks())
                .interestModel(InterestModel.valueOf(request.interestModel()))
                .interestRate(request.interestRate())
                .applicationFee(request.applicationFee())
                .gracePeriodDays(request.gracePeriodDays())
                .isActive(request.isActive() != null ? request.isActive() : true)
                .build();

        product = loanProductRepository.save(product);
        return mapToResponse(product);
    }

    @Transactional
    public LoanProductResponse updateLoanProduct(UUID id, LoanProductRequest request) {
        LoanProduct product = loanProductRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Loan product not found"));

        product.setName(request.name());
        product.setDescription(request.description());
        product.setRepaymentFrequency(RepaymentFrequency.valueOf(request.repaymentFrequency()));
        product.setTermWeeks(request.termWeeks());
        product.setInterestModel(InterestModel.valueOf(request.interestModel()));
        product.setInterestRate(request.interestRate());
        product.setApplicationFee(request.applicationFee());
        product.setGracePeriodDays(request.gracePeriodDays());

        if (request.isActive() != null) {
            product.setIsActive(request.isActive());
        }

        product = loanProductRepository.save(product);
        return mapToResponse(product);
    }

    @Transactional(readOnly = true)
    public List<LoanProductResponse> getAllLoanProducts(boolean activeOnly) {
        List<LoanProduct> products = activeOnly ?
                loanProductRepository.findByIsActiveTrue() :
                loanProductRepository.findAll();

        return products.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LoanProductResponse getLoanProduct(UUID id) {
        return loanProductRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new IllegalArgumentException("Loan product not found"));
    }

    private LoanProductResponse mapToResponse(LoanProduct product) {
        return new LoanProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getRepaymentFrequency().name(),
                product.getTermWeeks(),
                product.getInterestModel().name(),
                product.getInterestRate(),
                product.getApplicationFee(),
                product.getGracePeriodDays(),
                product.getIsActive()
        );
    }
}