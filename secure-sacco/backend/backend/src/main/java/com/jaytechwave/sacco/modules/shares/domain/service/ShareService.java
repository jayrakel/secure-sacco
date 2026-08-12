package com.jaytechwave.sacco.modules.shares.domain.service;

import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import com.jaytechwave.sacco.modules.shares.domain.entity.ShareAccount;
import com.jaytechwave.sacco.modules.shares.domain.entity.ShareTransaction;
import com.jaytechwave.sacco.modules.shares.domain.repository.ShareAccountRepository;
import com.jaytechwave.sacco.modules.shares.domain.repository.ShareTransactionRepository;
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
        return shareTransactionRepository.save(transaction);
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
        return shareTransactionRepository.save(transaction);
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
        return shareTransactionRepository.save(transaction);
    }

    public List<ShareAccount> getMemberAccounts(UUID memberId) {
        return shareAccountRepository.findByMemberId(memberId);
    }

    public List<ShareTransaction> getAccountTransactions(UUID accountId) {
        return shareTransactionRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }
}
