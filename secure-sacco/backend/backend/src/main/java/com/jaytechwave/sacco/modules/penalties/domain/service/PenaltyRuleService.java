package com.jaytechwave.sacco.modules.penalties.domain.service;

import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltyRuleRequest;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltyRuleResponse;
import com.jaytechwave.sacco.modules.penalties.domain.entity.AmountType;
import com.jaytechwave.sacco.modules.penalties.domain.entity.InterestMode;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyRule;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PenaltyRuleService {

    private final PenaltyRuleRepository penaltyRuleRepository;

    @Transactional
    public PenaltyRuleResponse createRule(PenaltyRuleRequest request) {
        if (penaltyRuleRepository.findByCode(request.code().toUpperCase()).isPresent()) {
            throw new IllegalArgumentException("Penalty Rule code already exists.");
        }

        PenaltyRule rule = PenaltyRule.builder()
                .code(request.code().toUpperCase())
                .name(request.name())
                .description(request.description())
                .baseAmountType(AmountType.valueOf(request.baseAmountType().toUpperCase()))
                .baseAmountValue(request.baseAmountValue())
                .gracePeriodDays(request.gracePeriodDays())
                .interestPeriodDays(request.interestPeriodDays())
                .interestRate(request.interestRate())
                .interestMode(InterestMode.valueOf(request.interestMode().toUpperCase()))
                .isActive(request.isActive() != null ? request.isActive() : true)
                .build();

        return mapToResponse(penaltyRuleRepository.save(rule));
    }

    @Transactional
    public PenaltyRuleResponse updateRule(UUID id, PenaltyRuleRequest request) {
        PenaltyRule rule = penaltyRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found"));

        rule.setName(request.name());
        rule.setDescription(request.description());
        rule.setBaseAmountType(AmountType.valueOf(request.baseAmountType().toUpperCase()));
        rule.setBaseAmountValue(request.baseAmountValue());
        rule.setGracePeriodDays(request.gracePeriodDays());
        rule.setInterestPeriodDays(request.interestPeriodDays());
        rule.setInterestRate(request.interestRate());
        rule.setInterestMode(InterestMode.valueOf(request.interestMode().toUpperCase()));

        if (request.isActive() != null) {
            rule.setIsActive(request.isActive());
        }

        return mapToResponse(penaltyRuleRepository.save(rule));
    }

    @Transactional(readOnly = true)
    public List<PenaltyRuleResponse> getAllRules(boolean activeOnly) {
        List<PenaltyRule> rules = activeOnly ?
                penaltyRuleRepository.findByIsActiveTrue() : penaltyRuleRepository.findAll();
        return rules.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private PenaltyRuleResponse mapToResponse(PenaltyRule rule) {
        return new PenaltyRuleResponse(
                rule.getId(), rule.getCode(), rule.getName(), rule.getDescription(),
                rule.getBaseAmountType().name(), rule.getBaseAmountValue(),
                rule.getGracePeriodDays(), rule.getInterestPeriodDays(),
                rule.getInterestRate(), rule.getInterestMode().name(), rule.getIsActive()
        );
    }
}