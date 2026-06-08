package com.jaytechwave.sacco.modules.savings.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

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
    private final SecurityAuditService securityAuditService;

    @Transactional
    public SavingsTransactionResponse processManualDeposit(ManualDepositRequest request) {
        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new IllegalStateException("Deposits can only be made for ACTIVE members.");
        }

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

        String reference = request.referenceNotes() != null && !request.referenceNotes().isBlank()
                ? request.referenceNotes()
                : "CASH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        SavingsTransaction transaction = SavingsTransaction.builder()
                .savingsAccountId(account.getId())
                .type(TransactionType.DEPOSIT)
                .channel(TransactionChannel.CASH)
                .amount(request.amount())
                .reference(reference)
                .status(TransactionStatus.POSTED)
                .postedAt(LocalDateTime.now())
                .build();

        transaction = savingsTransactionRepository.save(transaction);

        journalEntryService.postSavingsTransaction(
                member.getId(), request.amount(), "DEPOSIT", "CASH", reference
        );

        securityAuditService.logEvent(
                "SAVINGS_DEPOSIT_POSTED",
                member.getMemberNumber(),
                "Manual cash deposit of KES " + request.amount() + ". Ref: " + reference
        );

        log.info("Processed manual CASH deposit of {} for member {}", request.amount(), member.getMemberNumber());

        return new SavingsTransactionResponse(
                transaction.getId(), transaction.getSavingsAccountId(),
                transaction.getType().name(), transaction.getChannel().name(),
                transaction.getAmount(), transaction.getReference(),
                transaction.getStatus().name(), transaction.getPostedAt()
        );
    }


    /**
     * Credits a member's savings account from a Co-op paybill (non-STK) M-Pesa payment.
     * Called by {@link com.jaytechwave.sacco.modules.payments.job.MiniStatementPollingJob}
     * when a new credit is matched to a member by phone number.
     * The transaction is immediately POSTED — no pending state needed since
     * the money has already landed in the SACCO's Co-op account.
     */
    @Transactional
    public void processMpesaPaybillDeposit(UUID memberId, java.math.BigDecimal amount,
                                           String mpesaRef, String senderPhone) {
        // Fallback to now when no original value date is available (e.g. re-enrich for very old records)
        processMpesaPaybillDeposit(memberId, amount, mpesaRef, senderPhone, java.time.LocalDateTime.now());
    }

    /**
     * Value-date–aware overload. Always prefer this when the original payment date is known.
     *
     * <p>Passing {@code valueDate} from {@code CoopTransaction.valueDate} ensures the savings
     * transaction and its GL journal entry are dated to the <em>actual payment day</em>, not the
     * day reconciliation or polling ran. This prevents false late-payment flags and incorrect
     * penalty triggers when paybill deposits are processed hours or days after the fact.
     */
    public void processMpesaPaybillDeposit(UUID memberId, java.math.BigDecimal amount,
                                           String mpesaRef, String senderPhone,
                                           java.time.LocalDateTime valueDate) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));

        if (member.getStatus() != MemberStatus.ACTIVE) {
            log.warn("processMpesaPaybillDeposit: member {} is not ACTIVE — skipping auto-credit", memberId);
            return;
        }

        SavingsAccount account = savingsAccountRepository.findByMemberId(memberId)
                .orElseGet(() -> {
                    log.info("Auto-creating savings account for member {}", memberId);
                    return savingsAccountRepository.save(SavingsAccount.builder()
                            .memberId(memberId)
                            .status(SavingsAccountStatus.ACTIVE)
                            .build());
                });

        if (account.getStatus() == SavingsAccountStatus.FROZEN) {
            log.warn("processMpesaPaybillDeposit: savings account frozen for member {} — skipping", memberId);
            return;
        }

        String ref = mpesaRef != null ? mpesaRef : "PAYBILL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        if (savingsTransactionRepository.existsByReference(ref)) {
            log.info("processMpesaPaybillDeposit: transaction {} already posted — skipping duplicate", ref);
            return;
        }

        java.time.LocalDate txDate = (valueDate != null ? valueDate : java.time.LocalDateTime.now()).toLocalDate();

        SavingsTransaction transaction = SavingsTransaction.builder()
                .savingsAccountId(account.getId())
                .type(TransactionType.DEPOSIT)
                .channel(TransactionChannel.MPESA)
                .amount(amount)
                .reference(ref)
                .status(TransactionStatus.POSTED)
                .postedAt(valueDate != null ? valueDate : java.time.LocalDateTime.now())
                .build();

        savingsTransactionRepository.save(transaction);

        // Use the original payment date for the GL entry so reporting and penalty
        // calculations reflect when the member actually paid, not when we processed it.
        journalEntryService.postSavingsTransaction(memberId, amount, "DEPOSIT", "MPESA", ref, txDate);

        securityAuditService.logEvent(
                "SAVINGS_MPESA_PAYBILL_DEPOSIT",
                member.getMemberNumber(),
                String.format("M-Pesa paybill deposit of KES %s from %s auto-credited. Ref: %s dated %s",
                        amount, senderPhone, ref, txDate)
        );

        log.info("Auto-credited KES {} to member {} via paybill. Ref: {} dated {}", amount, member.getMemberNumber(), ref, txDate);
    }

    @Transactional
    public SavingsTransactionResponse processManualWithdrawal(ManualWithdrawalRequest request) {
        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new IllegalStateException("Withdrawals can only be made by ACTIVE members.");
        }

        SavingsAccount account = savingsAccountRepository.findByMemberId(member.getId())
                .orElseThrow(() -> new IllegalStateException("Savings account not found. Cannot withdraw."));

        if (account.getStatus() == SavingsAccountStatus.FROZEN) {
            throw new IllegalStateException("Savings account is frozen. Cannot process withdrawal.");
        }

        BigDecimal currentBalance = savingsTransactionRepository.calculateBalance(account.getId());
        if (currentBalance.compareTo(request.amount()) < 0) {
            throw new IllegalStateException(String.format(
                    "Insufficient funds. Requested: %s, Available: %s", request.amount(), currentBalance));
        }

        String reference = request.referenceNotes() != null && !request.referenceNotes().isBlank()
                ? request.referenceNotes()
                : "WDL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        SavingsTransaction transaction = SavingsTransaction.builder()
                .savingsAccountId(account.getId())
                .type(TransactionType.WITHDRAWAL)
                .channel(TransactionChannel.CASH)
                .amount(request.amount())
                .reference(reference)
                .status(TransactionStatus.POSTED)
                .postedAt(LocalDateTime.now())
                .build();

        transaction = savingsTransactionRepository.save(transaction);

        journalEntryService.postSavingsTransaction(
                member.getId(), request.amount(), "WITHDRAWAL", "CASH", reference
        );

        securityAuditService.logEvent(
                "SAVINGS_WITHDRAWAL_POSTED",
                member.getMemberNumber(),
                "Manual cash withdrawal of KES " + request.amount() + ". Ref: " + reference
        );

        log.info("Processed manual CASH withdrawal of {} for member {}", request.amount(), member.getMemberNumber());

        return new SavingsTransactionResponse(
                transaction.getId(), transaction.getSavingsAccountId(),
                transaction.getType().name(), transaction.getChannel().name(),
                transaction.getAmount(), transaction.getReference(),
                transaction.getStatus().name(), transaction.getPostedAt()
        );
    }

    @Transactional
    public InitiateMpesaResponse initiateMpesaDeposit(MpesaDepositRequest request, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getMember() == null || user.getMember().getStatus() != MemberStatus.ACTIVE) {
            throw new IllegalStateException("Only active members can initiate M-Pesa deposits.");
        }

        Member member = user.getMember();

        SavingsAccount account = savingsAccountRepository.findByMemberId(member.getId())
                .orElseGet(() -> savingsAccountRepository.save(SavingsAccount.builder()
                        .memberId(member.getId())
                        .status(SavingsAccountStatus.ACTIVE)
                        .build()));

        if (account.getStatus() == SavingsAccountStatus.FROZEN) {
            throw new IllegalStateException("Savings account is frozen. Cannot accept deposits.");
        }

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

        InitiateStkResponse paymentResponse = paymentService.initiateMpesaStkPush(
                new InitiateStkRequest(request.phoneNumber(), request.amount(), ref),
                member.getId()
        );

        securityAuditService.logEvent(
                "STK_PUSH_INITIATED",
                member.getMemberNumber(),
                "M-Pesa STK push of KES " + request.amount() + " initiated. Ref: " + ref
        );

        return new InitiateMpesaResponse(
                paymentResponse.message(),
                paymentResponse.checkoutRequestID(),
                paymentResponse.customerMessage()
        );
    }

    @Transactional(readOnly = true)
    public SavingsBalanceResponse getMyBalance(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getMember() == null) {
            throw new IllegalStateException("User is not a registered member.");
        }

        return savingsAccountRepository.findByMemberId(user.getMember().getId())
                .map(account -> new SavingsBalanceResponse(
                        savingsTransactionRepository.calculateBalance(account.getId()),
                        account.getStatus().name()
                ))
                .orElseGet(() -> new SavingsBalanceResponse(BigDecimal.ZERO, SavingsAccountStatus.ACTIVE.name()));
    }

    @Transactional(readOnly = true)
    public List<StatementTransactionResponse> getMemberStatement(UUID memberId, LocalDate from, LocalDate to) {
        Optional<SavingsAccount> accountOpt = savingsAccountRepository.findByMemberId(memberId);
        if (accountOpt.isEmpty()) {
            return Collections.emptyList();
        }

        List<SavingsTransaction> allTxs = savingsTransactionRepository
                .findBySavingsAccountIdOrderByCreatedAtAsc(accountOpt.get().getId());

        BigDecimal runningBalance = BigDecimal.ZERO;
        List<StatementTransactionResponse> statement = new ArrayList<>();

        for (SavingsTransaction tx : allTxs) {
            if (tx.getStatus() == TransactionStatus.POSTED) {
                if (tx.getType() == TransactionType.DEPOSIT
                        || tx.getType() == TransactionType.EXPENSE_REIMBURSEMENT) {
                    runningBalance = runningBalance.add(tx.getAmount());
                } else if (tx.getType() == TransactionType.WITHDRAWAL) {
                    runningBalance = runningBalance.subtract(tx.getAmount());
                }
            }

            LocalDateTime txDate = tx.getPostedAt() != null ? tx.getPostedAt() : tx.getCreatedAt();

            boolean inRange = true;
            if (from != null && txDate.toLocalDate().isBefore(from)) inRange = false;
            if (to != null && txDate.toLocalDate().isAfter(to)) inRange = false;

            if (inRange) {
                statement.add(new StatementTransactionResponse(
                        tx.getId(), tx.getType().name(), tx.getChannel().name(),
                        tx.getAmount(), tx.getReference(), tx.getStatus().name(),
                        txDate, runningBalance
                ));
            }
        }

        Collections.reverse(statement);
        return statement;
    }

    @Transactional(readOnly = true)
    public List<StatementTransactionResponse> getMyStatement(String email, LocalDate from, LocalDate to) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getMember() == null) {
            throw new IllegalStateException("User is not a registered member.");
        }

        return getMemberStatement(user.getMember().getId(), from, to);
    }

    /**
     * Credits an approved expense reimbursement directly to a member's savings account.
     * Called by {@code ExpenseClaimService} when a staff member approves a claim.
     *
     * <p>Creates a POSTED {@code SavingsTransaction} of type {@code EXPENSE_REIMBURSEMENT}
     * so the member sees it in their savings history. Also delegates to
     * {@link JournalEntryService} to post the double-entry GL:
     * <pre>
     *   DR 5360 Member Expense Reimbursement
     *   CR 2100 Member Savings Deposits
     * </pre>
     */
    @Transactional
    public void creditExpenseReimbursement(UUID memberId, java.math.BigDecimal amount, UUID claimId) {
        // Auto-create savings account if the member doesn't have one yet
        SavingsAccount account = savingsAccountRepository.findByMemberId(memberId)
                .orElseGet(() -> {
                    log.info("Auto-creating savings account for member {} during expense reimbursement", memberId);
                    return savingsAccountRepository.save(
                            SavingsAccount.builder()
                                    .memberId(memberId)
                                    .status(SavingsAccountStatus.ACTIVE)
                                    .build());
                });

        if (account.getStatus() == SavingsAccountStatus.FROZEN) {
            throw new IllegalStateException("Cannot credit reimbursement: savings account is frozen for member " + memberId);
        }

        String reference = "EXP-" + claimId.toString().substring(0, 8).toUpperCase();

        SavingsTransaction tx = SavingsTransaction.builder()
                .savingsAccountId(account.getId())
                .type(TransactionType.EXPENSE_REIMBURSEMENT)
                .channel(TransactionChannel.INTERNAL)
                .amount(amount)
                .reference(reference)
                .status(TransactionStatus.POSTED)
                .postedAt(LocalDateTime.now())
                .build();

        savingsTransactionRepository.save(tx);

        // Post the GL entry (DR 5360 / CR 2100)
        journalEntryService.postExpenseReimbursementClaim(memberId, amount, claimId.toString());

        log.info("Credited expense reimbursement of {} to savings account for member {}. Ref: {}",
                amount, memberId, reference);
    }
}