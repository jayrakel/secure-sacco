package com.jaytechwave.sacco.modules.shares.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import com.jaytechwave.sacco.modules.shares.domain.entity.ShareAccount;
import com.jaytechwave.sacco.modules.shares.domain.entity.ShareTransaction;
import com.jaytechwave.sacco.modules.shares.domain.repository.ShareAccountRepository;
import com.jaytechwave.sacco.modules.shares.domain.repository.ShareTransactionRepository;
import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShareService {

    private final ShareAccountRepository shareAccountRepository;
    private final ShareTransactionRepository shareTransactionRepository;
    private final MemberRepository memberRepository;
    private final PaymentProductRepository paymentProductRepository;
    private final SecurityAuditService securityAuditService;

    @Transactional
    public ShareAccount getOrCreateAccount(UUID memberId, UUID productId) {
        return shareAccountRepository.findByMemberIdAndProductId(memberId, productId)
                .orElseGet(() -> {
                    Member member = memberRepository.findById(memberId)
                            .orElseThrow(() -> new IllegalArgumentException("Member not found"));
                    PaymentProduct product = paymentProductRepository.findById(productId)
                            .orElseThrow(() -> new IllegalArgumentException("Product not found"));
                    
                    ShareAccount account = new ShareAccount();
                    account.setMember(member);
                    account.setProduct(product);
                    account.setBalance(BigDecimal.ZERO);
                    return shareAccountRepository.save(account);
                });
    }

    @Transactional
    public ShareTransaction deposit(UUID memberId, UUID productId, BigDecimal amount, String reference) {
        ShareAccount account = getOrCreateAccount(memberId, productId);
        
        account.setBalance(account.getBalance().add(amount));
        shareAccountRepository.save(account);
        
        ShareTransaction transaction = new ShareTransaction();
        transaction.setAccount(account);
        transaction.setAmount(amount);
        transaction.setType("DEPOSIT");
        transaction.setReference(reference);
        ShareTransaction savedTransaction = shareTransactionRepository.save(transaction);
        
        securityAuditService.logEvent("SHARE_DEPOSITED", account.getId().toString(), "Share deposited: " + amount + " for member: " + memberId);
        return savedTransaction;
    }
    
    @Transactional
    public ShareTransaction withdraw(UUID memberId, UUID productId, BigDecimal amount, String reference) {
        ShareAccount account = getOrCreateAccount(memberId, productId);
        
        if (account.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient share balance");
        }
        
        account.setBalance(account.getBalance().subtract(amount));
        shareAccountRepository.save(account);
        
        ShareTransaction transaction = new ShareTransaction();
        transaction.setAccount(account);
        transaction.setAmount(amount.negate());
        transaction.setType("WITHDRAWAL");
        transaction.setReference(reference);
        ShareTransaction savedTransaction = shareTransactionRepository.save(transaction);
        
        securityAuditService.logEvent("SHARE_WITHDRAWN", account.getId().toString(), "Share withdrawn: " + amount + " for member: " + memberId);
        return savedTransaction;
    }
    
    @Transactional
    public ShareTransaction recordDividend(UUID memberId, UUID productId, BigDecimal amount, String reference) {
        ShareAccount account = getOrCreateAccount(memberId, productId);
        
        account.setBalance(account.getBalance().add(amount));
        shareAccountRepository.save(account);
        
        ShareTransaction transaction = new ShareTransaction();
        transaction.setAccount(account);
        transaction.setAmount(amount);
        transaction.setType("DIVIDEND");
        transaction.setReference(reference);
        ShareTransaction savedTransaction = shareTransactionRepository.save(transaction);
        
        securityAuditService.logEvent("SHARE_DIVIDEND_RECORDED", account.getId().toString(), "Share dividend recorded: " + amount + " for member: " + memberId);
        return savedTransaction;
    }

    @Transactional(readOnly = true)
    public List<com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareAccountDTO> getMemberAccounts(UUID memberId) {
        return shareAccountRepository.findByMemberId(memberId).stream()
                .map(this::toShareAccountDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareTransactionDTO> getAccountTransactions(UUID accountId) {
        return shareTransactionRepository.findByAccountIdOrderByCreatedAtDesc(accountId).stream()
                .map(this::toShareTransactionDTO)
                .toList();
    }
    
    @Transactional(readOnly = true)
    public List<com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.AdminShareAccountDTO> getAllAccounts() {
        return shareAccountRepository.findAll().stream()
                .map(this::toAdminShareAccountDTO)
                .toList();
    }
    
    private com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareAccountDTO toShareAccountDTO(ShareAccount account) {
        return new com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareAccountDTO(
                account.getId(),
                account.getBalance(),
                account.getStatus(),
                new com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareProductDTO(
                        account.getProduct().getName(),
                        account.getProduct().getCode()
                ),
                account.getCreatedAt()
        );
    }
    
    private com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.AdminShareAccountDTO toAdminShareAccountDTO(ShareAccount account) {
        return new com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.AdminShareAccountDTO(
                account.getId(),
                account.getMember().getId(),
                account.getMember().getFirstName() + " " + account.getMember().getLastName(),
                account.getMember().getMemberNumber(),
                account.getBalance(),
                account.getStatus(),
                new com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareProductDTO(
                        account.getProduct().getName(),
                        account.getProduct().getCode()
                ),
                account.getCreatedAt()
        );
    }

    private com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareTransactionDTO toShareTransactionDTO(ShareTransaction transaction) {
        return new com.jaytechwave.sacco.modules.shares.api.dto.ShareDTOs.ShareTransactionDTO(
                transaction.getId(),
                transaction.getAmount(),
                transaction.getType(),
                transaction.getReference(),
                transaction.getCreatedAt()
        );
    }
}
