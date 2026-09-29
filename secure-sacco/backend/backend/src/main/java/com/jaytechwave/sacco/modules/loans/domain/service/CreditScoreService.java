package com.jaytechwave.sacco.modules.loans.domain.service;

import com.jaytechwave.sacco.modules.loans.domain.entity.LoanApplication;
import com.jaytechwave.sacco.modules.loans.domain.entity.LoanStatus;
import com.jaytechwave.sacco.modules.loans.domain.repository.LoanApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreditScoreService {

    private final LoanApplicationRepository loanApplicationRepository;

    /**
     * Calculates the member's credit score on a scale of 1 to 10.
     * Base score is 5.
     * +1 for each CLOSED (fully paid) loan.
     * -2 for each DEFAULTED loan.
     * Score is capped between 1 and 10.
     *
     * @param memberId the UUID of the member
     * @return an integer representing the credit score (1-10)
     */
    public int calculateCreditScore(UUID memberId) {
        List<LoanApplication> loans = loanApplicationRepository.findByMemberIdOrderByCreatedAtDesc(memberId);
        
        int score = 5; // Base score
        
        for (LoanApplication loan : loans) {
            if (loan.getStatus() == LoanStatus.CLOSED) {
                score += 1;
            } else if (loan.getStatus() == LoanStatus.DEFAULTED) {
                score -= 2;
            }
        }
        
        // Enforce bounds
        if (score > 10) {
            score = 10;
        } else if (score < 1) {
            score = 1;
        }
        
        return score;
    }

    /**
     * Maps a 1-10 credit score to a 0-5 star rating.
     * 1-3 -> 0 stars
     * 4 -> 1 star
     * 5 -> 2 stars
     * 6-7 -> 3 stars
     * 8-9 -> 4 stars
     * 10 -> 5 stars
     *
     * @param score 1-10 credit score
     * @return 0-5 star rating
     */
    public int mapToStarRating(int score) {
        if (score <= 3) return 0;
        if (score == 4) return 1;
        if (score == 5) return 2;
        if (score <= 7) return 3;
        if (score <= 9) return 4;
        return 5;
    }
}
