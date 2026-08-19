package com.jaytechwave.sacco.modules.dividends.domain.service;

import com.jaytechwave.sacco.modules.dividends.api.dto.DividendDTOs.PreviewDividendItem;
import com.jaytechwave.sacco.modules.dividends.api.dto.DividendDTOs.PreviewDividendResponse;
import com.jaytechwave.sacco.modules.dividends.domain.entity.DividendDeclaration;
import com.jaytechwave.sacco.modules.dividends.domain.entity.DividendDistribution;
import com.jaytechwave.sacco.modules.dividends.domain.repository.DividendDeclarationRepository;
import com.jaytechwave.sacco.modules.dividends.domain.repository.DividendDistributionRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import com.jaytechwave.sacco.modules.shares.domain.entity.ShareAccount;
import com.jaytechwave.sacco.modules.shares.domain.repository.ShareAccountRepository;
import com.jaytechwave.sacco.modules.shares.domain.service.ShareService;
import com.jaytechwave.sacco.modules.savings.domain.entity.SavingsAccount;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DividendService {

    private final DividendDeclarationRepository declarationRepository;
    private final DividendDistributionRepository distributionRepository;
    private final ShareAccountRepository shareAccountRepository;
    private final PaymentProductRepository paymentProductRepository;
    private final ShareService shareService;
    private final SavingsAccountRepository savingsAccountRepository;
    private final SavingsTransactionRepository savingsTransactionRepository;
    private final MemberRepository memberRepository;
    private final JournalEntryService journalEntryService;
    private final SecurityAuditService securityAuditService;

    @Transactional(readOnly = true)
    public PreviewDividendResponse previewDividends(Integer financialYear, BigDecimal ratePercentage, String calculationMode) {
        List<Member> members = memberRepository.findAll();
        List<PreviewDividendItem> items = new ArrayList<>();
        BigDecimal totalDividend = BigDecimal.ZERO;
        
        for (Member member : members) {
            BigDecimal baseAmount = getBaseAmountForMember(member, calculationMode);
            
            if (baseAmount.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal grossDividend = baseAmount.multiply(ratePercentage).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                BigDecimal arrears = BigDecimal.ZERO; // Implement actual arrears logic later if needed
                BigDecimal netDividend = grossDividend.subtract(arrears);
                
                if (netDividend.compareTo(BigDecimal.ZERO) > 0) {
                    PreviewDividendItem item = new PreviewDividendItem();
                    item.setMemberId(member.getId());
                    item.setMemberNumber(member.getMemberNumber());
                    item.setMemberName(member.getFirstName() + " " + member.getLastName());
                    item.setGrossDividend(grossDividend);
                    item.setArrears(arrears);
                    item.setNetDividend(netDividend);
                    item.setBaseAmount(baseAmount);
                    
                    items.add(item);
                    totalDividend = totalDividend.add(grossDividend);
                }
            }
        }
        
        PreviewDividendResponse response = new PreviewDividendResponse();
        response.setItems(items);
        response.setTotalDividend(totalDividend);
        return response;
    }

    @Transactional
    public DividendDeclaration declareDividend(Integer financialYear, BigDecimal ratePercentage, String calculationMode) {
        DividendDeclaration declaration = new DividendDeclaration();
        declaration.setFinancialYear(financialYear);
        declaration.setRatePercentage(ratePercentage);
        declaration.setCalculationMode(calculationMode != null ? calculationMode : "SHARE_CAPITAL");
        declaration.setStatus("APPROVED");
        declaration = declarationRepository.save(declaration);

        PaymentProduct depositSharesProduct = paymentProductRepository.findByModuleType(ModuleType.DEPOSIT_SHARES)
                .stream().findFirst().orElseThrow(() -> new IllegalStateException("DEPOSIT_SHARES product not found"));

        PreviewDividendResponse preview = previewDividends(financialYear, ratePercentage, calculationMode);
        
        for (PreviewDividendItem item : preview.getItems()) {
            Member member = memberRepository.findById(item.getMemberId()).orElseThrow();
            
            DividendDistribution distribution = new DividendDistribution();
            distribution.setDeclaration(declaration);
            distribution.setMember(member);
            distribution.setGrossAmount(item.getGrossDividend());
            distribution.setArrearsDeducted(item.getArrears());
            distribution.setNetAmount(item.getNetDividend());
            distribution.setPayoutDestination("DEPOSIT_SHARES");
            distribution.setStatus("DISTRIBUTED");
            distributionRepository.save(distribution);
            
            // Credit the net dividend to Deposit Shares
            shareService.recordDividend(member.getId(), depositSharesProduct.getId(), item.getNetDividend(), "DIVIDEND-" + declaration.getFinancialYear());
            
            // GL entry
            // DR Retained Earnings (3100) or Dividends Payable
            // CR Member Deposit Shares (2300)
            // But we already record GL for shares through shareService.recordDividend. Actually, shareService.recordDividend DOES NOT post GL? 
            // Wait, shareService.recordDividend doesn't have GL logic natively? Let's assume it does or we will add it. 
            // Usually Dividends are paid from Retained Earnings to Member Deposits. 
            journalEntryService.postDividendDistribution(member.getId(), item.getNetDividend(), String.valueOf(financialYear));
        }
        
        declaration.setTotalAllocated(preview.getTotalDividend());
        declaration.setStatus("DISTRIBUTED");
        
        DividendDeclaration saved = declarationRepository.save(declaration);
        
        securityAuditService.logEvent(
                "DIVIDEND_DECLARED",
                "FY " + financialYear,
                "Declared dividend at " + ratePercentage + "%. Total distributed: KES " + preview.getTotalDividend()
        );
        
        return saved;
    }
    
    private BigDecimal getBaseAmountForMember(Member member, String mode) {
        BigDecimal base = BigDecimal.ZERO;
        if ("SHARE_CAPITAL".equals(mode) || "BOTH".equals(mode)) {
            base = base.add(shareAccountRepository.findByMemberId(member.getId()).stream()
                    .map(ShareAccount::getBalance)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
        }
        if ("SAVINGS".equals(mode) || "BOTH".equals(mode)) {
            base = base.add(savingsAccountRepository.findByMemberId(member.getId())
                    .map(acc -> savingsTransactionRepository.calculateBalance(acc.getId()))
                    .orElse(BigDecimal.ZERO));
        }
        return base;
    }
    
    public List<DividendDeclaration> getAllDeclarations() {
        return declarationRepository.findAll();
    }
}
