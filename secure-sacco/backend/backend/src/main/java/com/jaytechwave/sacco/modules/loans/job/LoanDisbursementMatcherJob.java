package com.jaytechwave.sacco.modules.loans.job;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import com.jaytechwave.sacco.modules.loans.domain.service.LoanScheduleService;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction;
import com.jaytechwave.sacco.modules.payments.domain.repository.CoopTransactionRepository;
import com.jaytechwave.sacco.modules.core.notifications.EmailNotificationService;
import com.jaytechwave.sacco.modules.core.notifications.SmsNotificationService;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Polls disbursed loans and checks for their respective DR transactions in Co-op Connect
 * to transition them to ACTIVE state and start the loan schedule countdown.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LoanDisbursementMatcherJob {

    private final LoanApplicationRepository loanApplicationRepository;
    private final CoopTransactionRepository coopTransactionRepository;
    private final LoanScheduleService loanScheduleService;
    private final EmailNotificationService emailNotificationService;
    private final SmsNotificationService smsNotificationService;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;

    @Scheduled(fixedDelay = 600000) // Every 10 minutes
    @Transactional
    public void matchDisbursedLoans() {
        log.info("Starting LoanDisbursementMatcherJob...");
        List<LoanApplication> disbursedLoans = loanApplicationRepository.findByStatus(LoanStatus.DISBURSED);
        int activated = 0;

        for (LoanApplication loan : disbursedLoans) {
            String chequeNumber = loan.getChequeNumber();
            if (chequeNumber == null || chequeNumber.isBlank()) {
                // Not a cheque disbursement, or manually skip it?
                // For now, if no cheque number, we can't auto-match
                continue;
            }

            // Find DR transaction with cheque number in narration
            List<CoopTransaction> matches = coopTransactionRepository.findDebitByChequeNumber(chequeNumber);
            if (!matches.isEmpty()) {
                CoopTransaction tx = matches.get(0); // Take the first matched DR
                
                log.info("Matched cheque {} for Loan {}, activating schedule.", chequeNumber, loan.getId());
                
                loan.setChequeClearedDate(tx.getValueDate());
                loan.setStatus(LoanStatus.ACTIVE);
                loanApplicationRepository.save(loan);
                
                // Generate the repayment schedule based on cheque cleared date
                loanScheduleService.generateWeeklySchedule(loan);
                
                // Notify the member
                Member member = memberRepository.findById(loan.getMemberId()).orElse(null);
                User user = member != null ? userRepository.findByMemberId(member.getId()).orElse(null) : null;
                
                if (member != null && user != null) {
                    String message = String.format("Dear %s, your loan of KES %s (Cheque %s) has cleared and is now active.",
                            member.getFirstName(), loan.getPrincipalAmount(), chequeNumber);
                    smsNotificationService.sendNotificationSms(member.getPhoneNumber(), message);
                    
                    emailNotificationService.sendSystemAlertEmail(
                            user.getEmail(),
                            "Loan Disbursement Cleared - " + loan.getLoanProduct().getName(),
                            message
                    );
                }
                
                activated++;
            }
        }
        
        log.info("Finished LoanDisbursementMatcherJob. Activated {} loans.", activated);
    }
}
