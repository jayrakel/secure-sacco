import apiClient from '../../../shared/api/api-client';

export interface HistoricalMemberRequest {
    firstName: string; lastName: string; email: string;
    phoneNumber: string; plainTextPassword: string; registrationDate: string;
}
export interface HistoricalSavingsRequest {
    memberNumber: string; amount: number; referenceNumber: string; transactionDate: string;
}
export interface HistoricalWithdrawalRequest {
    memberNumber: string; amount: number; referenceNumber: string; transactionDate: string;
}
export interface HistoricalLoanDisbursementRequest {
    memberNumber: string; loanProductCode: string; principal: number; interest: number;
    weeklyScheduled: number; firstPaymentDate: string; termWeeks: number; referenceNumber: string;
}
export interface HistoricalLoanRepaymentRequest {
    memberNumber: string; amount: number; transactionDate: string; referenceNumber: string;
}
/** Calls the standard /loans/applications/refinance endpoint with an optional historical date override */
export interface LoanRefinanceRequest {
    oldLoanId: string;
    loanProductCode: string;
    topUpAmount: number;           // 0 = pure restructure, >0 = top-up
    interestOverride?: number | null;
    newTermWeeks: number;
    referenceNumber: string;
    historicalDateOverride?: string; // yyyy-MM-dd
}
export interface HistoricalPenaltyRequest {
    memberNumber: string; amount: number; penaltyDate: string; referenceNumber: string;
}
export interface CronEvaluationRequest { evaluationDate: string; }

export interface MigrateMemberResponse   { message: string; memberNumber: string; }
export interface MigrateSavingsResponse  { message: string; transactionReference: string; }
export interface MigrateLoanResponse     { id: string; }
export interface ActiveLoanResponse      { id: string; }
export interface CronEvaluationResponse  { [key: string]: unknown; }

export const migrationApi = {
    migrateMember:           (d: HistoricalMemberRequest):          Promise<MigrateMemberResponse>  => apiClient.post('/migration/members',              d).then(r => r.data),
    migrateSavings:          (d: HistoricalSavingsRequest):         Promise<MigrateSavingsResponse> => apiClient.post('/migration/savings',               d).then(r => r.data),
    migrateWithdrawal:       (d: HistoricalWithdrawalRequest):      Promise<MigrateSavingsResponse> => apiClient.post('/migration/withdrawals',            d).then(r => r.data),
    migrateLoanDisbursement: (d: HistoricalLoanDisbursementRequest):Promise<MigrateLoanResponse>    => apiClient.post('/migration/loans/disburse',         d).then(r => r.data),
    migrateLoanRepayment:    (d: HistoricalLoanRepaymentRequest):   Promise<string>                 => apiClient.post('/migration/loans/repay',            d).then(r => r.data),
    getActiveLoanId:         (memberNumber: string):                Promise<ActiveLoanResponse>     => apiClient.get(`/migration/loans/active/${memberNumber}`).then(r => r.data),
    refinanceLoan:           (d: LoanRefinanceRequest):             Promise<MigrateLoanResponse>    => apiClient.post('/loans/applications/refinance',     d).then(r => r.data),
    migrateHistoricalPenalty:(d: HistoricalPenaltyRequest):         Promise<{message:string}>       => apiClient.post('/migration/penalties/apply',         d).then(r => r.data),
    runCronEvaluation:       (d: CronEvaluationRequest):            Promise<CronEvaluationResponse> => apiClient.post('/migration/cron/evaluate-penalties', d).then(r => r.data),
};