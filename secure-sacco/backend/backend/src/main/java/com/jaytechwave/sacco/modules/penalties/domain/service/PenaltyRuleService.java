package com.jaytechwave.sacco.modules.penalties.domain.service;

import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltyRuleRequest;
import com.jaytechwave.sacco.modules.penalties.api.dto.PenaltyDTOs.PenaltyRuleResponse;
import com.jaytechwave.sacco.modules.penalties.domain.entity.AmountType;
import com.jaytechwave.sacco.modules.penalties.domain.entity.InterestMode;
import com.jaytechwave.sacco.modules.penalties.domain.entity.PenaltyRule;
import com.jaytechwave.sacco.modules.penalties.domain.repository.PenaltyRuleRepository;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
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
    private final SecurityAuditService securityAuditService;

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

        rule = penaltyRuleRepository.save(rule);
        securityAuditService.logEvent("PENALTY_RULE_CREATED", rule.getId().toString(), "Penalty rule created: " + rule.getName());
        return mapToResponse(rule);
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

        rule = penaltyRuleRepository.save(rule);
        securityAuditService.logEvent("PENALTY_RULE_UPDATED", rule.getId().toString(), "Penalty rule updated: " + rule.getName());
        return mapToResponse(rule);
    }

    @Transactional(readOnly = true)
    public List<PenaltyRuleResponse> getAllRules(boolean activeOnly) {
        List<PenaltyRule> rules = activeOnly ?
                penaltyRuleRepository.findByIsActiveTrue() : penaltyRuleRepository.findAll();
        return rules.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deleteRule(UUID id) {
        PenaltyRule rule = penaltyRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found"));

        long usageCount = penaltyRuleRepository.countPenaltiesByRuleId(id);
        if (usageCount > 0) {
            throw new IllegalStateException(
                    "Cannot delete '" + rule.getName() + "' — it has been applied to " +
                            usageCount + " penalty record(s). Deactivate it instead."
            );
        }
        penaltyRuleRepository.deleteById(id);
        securityAuditService.logEvent("PENALTY_RULE_DELETED", id.toString(), "Penalty rule deleted: " + rule.getName());
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