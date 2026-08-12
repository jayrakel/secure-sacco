package com.jaytechwave.sacco.modules.dividends.domain.service;

import com.jaytechwave.sacco.modules.dividends.domain.entity.DividendDeclaration;
import com.jaytechwave.sacco.modules.dividends.domain.entity.DividendDistribution;
import com.jaytechwave.sacco.modules.dividends.domain.repository.DividendDeclarationRepository;
import com.jaytechwave.sacco.modules.dividends.domain.repository.DividendDistributionRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import com.jaytechwave.sacco.modules.shares.domain.entity.ShareAccount;
import com.jaytechwave.sacco.modules.shares.domain.repository.ShareAccountRepository;
import com.jaytechwave.sacco.modules.shares.domain.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DividendService {

    private final DividendDeclarationRepository declarationRepository;
    private final DividendDistributionRepository distributionRepository;
    private final ShareAccountRepository shareAccountRepository;
    private final PaymentProductRepository paymentProductRepository;
    private final ShareService shareService;

    @Transactional
    public DividendDeclaration declareDividend(Integer financialYear, BigDecimal ratePercentage) {
        DividendDeclaration declaration = new DividendDeclaration();
        declaration.setFinancialYear(financialYear);
        declaration.setRatePercentage(ratePercentage);
        declaration.setStatus("APPROVED");
        declaration = declarationRepository.save(declaration);

        // Fetch all share accounts
        List<ShareAccount> allShares = shareAccountRepository.findAll();
        
        PaymentProduct depositSharesProduct = paymentProductRepository.findByModuleType(ModuleType.DEPOSIT_SHARES)
                .stream().findFirst().orElseThrow(() -> new IllegalStateException("DEPOSIT_SHARES product not found"));

        BigDecimal totalAllocated = BigDecimal.ZERO;
        
        for (ShareAccount account : allShares) {
            if (account.getBalance().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            
            Member member = account.getMember();
            
            BigDecimal grossDividend = account.getBalance().multiply(ratePercentage).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            
            // For now, assume no arrears deduction logic is fully implemented, just take 0 as arrears
            BigDecimal arrears = BigDecimal.ZERO; 
            
            BigDecimal netDividend = grossDividend.subtract(arrears);
            
            if (netDividend.compareTo(BigDecimal.ZERO) > 0) {
                DividendDistribution distribution = new DividendDistribution();
                distribution.setDeclaration(declaration);
                distribution.setMember(member);
                distribution.setGrossAmount(grossDividend);
                distribution.setArrearsDeducted(arrears);
                distribution.setNetAmount(netDividend);
                distribution.setPayoutDestination("DEPOSIT_SHARES");
                distribution.setStatus("DISTRIBUTED");
                distributionRepository.save(distribution);
                
                // Credit the net dividend to Deposit Shares
                shareService.recordDividend(member.getId(), depositSharesProduct.getId(), netDividend, "DIVIDEND-" + declaration.getFinancialYear());
                
                totalAllocated = totalAllocated.add(grossDividend);
            }
        }
        
        declaration.setTotalAllocated(totalAllocated);
        declaration.setStatus("DISTRIBUTED");
        return declarationRepository.save(declaration);
    }
    
    public List<DividendDeclaration> getAllDeclarations() {
        return declarationRepository.findAll();
    }
}
