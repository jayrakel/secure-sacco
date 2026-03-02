package com.jaytechwave.sacco.modules.savings.domain.service;

import com.jaytechwave.sacco.modules.payments.domain.service.PaymentService;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkResponse;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.accounting.domain.service.JournalEntryService;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.savings.api.dto.SavingsDTOs.*;
import com.jaytechwave.sacco.modules.savings.domain.entity.*;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsAccountRepository;
import com.jaytechwave.sacco.modules.savings.domain.repository.SavingsTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SavingsService {

    private final SavingsAccountRepository savingsAccountRepository;
    private final SavingsTransactionRepository savingsTransactionRepository;
    private final MemberRepository memberRepository;
    private final JournalEntryService journalEntryService;
    private final PaymentService paymentService;
    private final UserRepository userRepository;

    @Transactional
    public SavingsTransactionResponse processManualDeposit(ManualDepositRequest request) {
        // 1. Validate Member is ACTIVE
        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new IllegalStateException("Deposits can only be made for ACTIVE members.");
        }

        // 2. Get or Auto-Create Savings Account
        SavingsAccount account = savingsAccountRepository.findByMemberId(member.getId())
                .orElseGet(() -> {
                    log.info("Auto-creating savings account for member {}", member.getId());
                    SavingsAccount newAccount = SavingsAccount.builder()
                            .memberId(member.getId())
                            .status(SavingsAccountStatus.ACTIVE)
                            .build();
                    return savingsAccountRepository.save(newAccount);
                });

        if (account.getStatus() == SavingsAccountStatus.FROZEN) {
            throw new IllegalStateException("Savings account is frozen. Cannot accept deposits.");
        }

        // 3. Create the Transaction Record
        String reference = request.referenceNotes() != null && !request.referenceNotes().isBlank()
                ? request.referenceNotes()
                : "CASH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        SavingsTransaction transaction = SavingsTransaction.builder()
                .savingsAccountId(account.getId())
                .type(TransactionType.DEPOSIT)
                .channel(TransactionChannel.CASH) // Manual deposit implies over-the-counter cash
                .amount(request.amount())
                .reference(reference)
                .status(TransactionStatus.POSTED)
                .postedAt(LocalDateTime.now())
                .build();

        transaction = savingsTransactionRepository.save(transaction);

        // 4. Post to Accounting Ledger!
        journalEntryService.postSavingsTransaction(
                member.getId(),
                request.amount(),
                "DEPOSIT",
                "CASH",
                reference
        );

        log.info("Processed manual CASH deposit of {} for member {}", request.amount(), member.getMemberNumber());

        return new SavingsTransactionResponse(
                transaction.getId(),
                transaction.getSavingsAccountId(),
                transaction.getType().name(),
                transaction.getChannel().name(),
                transaction.getAmount(),
                transaction.getReference(),
                transaction.getStatus().name(),
                transaction.getPostedAt()
        );
    }

    @Transactional
    public SavingsTransactionResponse processManualWithdrawal(ManualWithdrawalRequest request) {
        // 1. Validate Member
        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new IllegalStateException("Withdrawals can only be made by ACTIVE members.");
        }

        // 2. Fetch Account & Verify Status
        SavingsAccount account = savingsAccountRepository.findByMemberId(member.getId())
                .orElseThrow(() -> new IllegalStateException("Savings account not found. Cannot withdraw."));

        if (account.getStatus() == SavingsAccountStatus.FROZEN) {
            throw new IllegalStateException("Savings account is frozen. Cannot process withdrawal.");
        }

        // 3. ENFORCE BALANCE RULE
        BigDecimal currentBalance = savingsTransactionRepository.calculateBalance(account.getId());
        if (currentBalance.compareTo(request.amount()) < 0) {
            throw new IllegalStateException(String.format("Insufficient funds. Requested: %s, Available: %s", request.amount(), currentBalance));
        }

        // 4. Create the Transaction Record
        String reference = request.referenceNotes() != null && !request.referenceNotes().isBlank()
                ? request.referenceNotes()
                : "WDL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        SavingsTransaction transaction = SavingsTransaction.builder()
                .savingsAccountId(account.getId())
                .type(TransactionType.WITHDRAWAL)
                .channel(TransactionChannel.CASH) // Manual withdrawal implies over-the-counter cash payout
                .amount(request.amount())
                .reference(reference)
                .status(TransactionStatus.POSTED)
                .postedAt(LocalDateTime.now())
                .build();

        transaction = savingsTransactionRepository.save(transaction);

        // 5. Post to Accounting Ledger (Dr Savings Liability / Cr Cash on Hand)
        journalEntryService.postSavingsTransaction(
                member.getId(),
                request.amount(),
                "WITHDRAWAL",
                "CASH",
                reference
        );

        log.info("Processed manual CASH withdrawal of {} for member {}", request.amount(), member.getMemberNumber());

        return new SavingsTransactionResponse(
                transaction.getId(),
                transaction.getSavingsAccountId(),
                transaction.getType().name(),
                transaction.getChannel().name(),
                transaction.getAmount(),
                transaction.getReference(),
                transaction.getStatus().name(),
                transaction.getPostedAt()
        );
    }

    @Transactional
    public InitiateMpesaResponse initiateMpesaDeposit(MpesaDepositRequest request, String email) {
        // 1. Fetch User strictly from Authentication Context to prevent spoofing
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getMember() == null || user.getMember().getStatus() != MemberStatus.ACTIVE) {
            throw new IllegalStateException("Only active members can initiate M-Pesa deposits.");
        }

        Member member = user.getMember();

        // 2. Get or Auto-create Account
        SavingsAccount account = savingsAccountRepository.findByMemberId(member.getId())
                .orElseGet(() -> savingsAccountRepository.save(SavingsAccount.builder()
                        .memberId(member.getId())
                        .status(SavingsAccountStatus.ACTIVE)
                        .build()));

        if (account.getStatus() == SavingsAccountStatus.FROZEN) {
            throw new IllegalStateException("Savings account is frozen. Cannot accept deposits.");
        }

        // 3. Create a PENDING Savings Transaction with "DEP-" prefix
        String ref = "DEP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        SavingsTransaction transaction = SavingsTransaction.builder()
                .savingsAccountId(account.getId())
                .type(TransactionType.DEPOSIT)
                .channel(TransactionChannel.MPESA)
                .amount(request.amount())
                .reference(ref)
                .status(TransactionStatus.PENDING)
                .build();

        savingsTransactionRepository.save(transaction);

        // 4. Call Payment Service for Daraja STK Push
        InitiateStkResponse paymentResponse = paymentService.initiateMpesaStkPush(
                new InitiateStkRequest(request.phoneNumber(), request.amount(), ref),
                member.getId()
        );

        return new InitiateMpesaResponse(
                paymentResponse.message(),
                paymentResponse.checkoutRequestID(),
                paymentResponse.customerMessage()
        );
    }
}