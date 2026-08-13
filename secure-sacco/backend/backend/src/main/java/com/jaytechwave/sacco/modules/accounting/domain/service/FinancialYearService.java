package com.jaytechwave.sacco.modules.accounting.domain.service;

import com.jaytechwave.sacco.modules.accounting.api.dto.CreateFinancialYearRequest;
import com.jaytechwave.sacco.modules.accounting.api.dto.FinancialYearResponse;
import com.jaytechwave.sacco.modules.accounting.domain.model.FinancialYear;
import com.jaytechwave.sacco.modules.accounting.domain.repository.FinancialYearRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FinancialYearService {

    private final FinancialYearRepository financialYearRepository;

    @Transactional
    public FinancialYearResponse createFinancialYear(CreateFinancialYearRequest request) {
        if (financialYearRepository.findByYearName(request.yearName()).isPresent()) {
            throw new IllegalArgumentException("Financial year with name " + request.yearName() + " already exists.");
        }

        FinancialYear fy = FinancialYear.builder()
                .yearName(request.yearName())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .status(FinancialYear.FinancialYearStatus.OPEN)
                .current(false)
                .build();
                
        // If it's the first one, make it current
        if (financialYearRepository.count() == 0) {
            fy.setCurrent(true);
        }

        return toResponse(financialYearRepository.save(fy));
    }

    @Transactional(readOnly = true)
    public List<FinancialYearResponse> getAllFinancialYears() {
        return financialYearRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public FinancialYearResponse closeFinancialYear(UUID id) {
        FinancialYear fy = financialYearRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Financial year not found"));
                
        fy.setStatus(FinancialYear.FinancialYearStatus.CLOSED);
        fy.setCurrent(false);
        return toResponse(financialYearRepository.save(fy));
    }
    
    @Transactional
    public FinancialYearResponse setCurrentFinancialYear(UUID id) {
        FinancialYear fy = financialYearRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Financial year not found"));
                
        if (fy.getStatus() == FinancialYear.FinancialYearStatus.CLOSED) {
            throw new IllegalStateException("Cannot set a closed financial year as current");
        }
        
        financialYearRepository.findByCurrentTrue().ifPresent(currentFy -> {
            currentFy.setCurrent(false);
            financialYearRepository.save(currentFy);
        });
        
        fy.setCurrent(true);
        return toResponse(financialYearRepository.save(fy));
    }

    private FinancialYearResponse toResponse(FinancialYear fy) {
        return new FinancialYearResponse(
                fy.getId(),
                fy.getYearName(),
                fy.getStartDate(),
                fy.getEndDate(),
                fy.getStatus().name(),
                fy.isCurrent()
        );
    }
}
