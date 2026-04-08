import apiClient from '../../../shared/api/api-client';

// ─── Request types (mirror the backend DTOs exactly) ─────────────────────────

export interface HistoricalMemberRequest {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    plainTextPassword: string;
    registrationDate: string; // ISO date yyyy-MM-dd
}

export interface HistoricalSavingsRequest {
    memberNumber: string;
    amount: number;
    referenceNumber: string;
    transactionDate: string;
}

export interface HistoricalWithdrawalRequest {
    memberNumber: string;
    amount: number;
    referenceNumber: string;
    transactionDate: string;
}

export interface HistoricalLoanDisbursementRequest {
    memberNumber: string;
    loanProductCode: string;   // product name used by backend findByName
    principal: number;
    interest: number;
    weeklyScheduled: number;
    firstPaymentDate: string;
    termWeeks: number;
    referenceNumber: string;
}

export interface HistoricalLoanRepaymentRequest {
    memberNumber: string;
    amount: number;
    transactionDate: string;
    referenceNumber: string;
}

export interface HistoricalPenaltyRequest {
    memberNumber: string;
    amount: number;
    penaltyDate: string;
    referenceNumber: string;
}

export interface CronEvaluationRequest {
    evaluationDate: string;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface MigrateMemberResponse {
    message: string;
    memberNumber: string;
}

export interface MigrateSavingsResponse {
    message: string;
    transactionReference: string;
}

export interface MigrateLoanResponse {
    id: string;
}

export interface ActiveLoanResponse {
    id: string;
}

export interface CronEvaluationResponse {
    [key: string]: unknown;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const migrationApi = {

    // Members
    migrateMember: (data: HistoricalMemberRequest): Promise<MigrateMemberResponse> =>
        apiClient.post('/migration/members', data).then(r => r.data),

    // Savings
    migrateSavings: (data: HistoricalSavingsRequest): Promise<MigrateSavingsResponse> =>
        apiClient.post('/migration/savings', data).then(r => r.data),

    // Withdrawals
    migrateWithdrawal: (data: HistoricalWithdrawalRequest): Promise<MigrateSavingsResponse> =>
        apiClient.post('/migration/withdrawals', data).then(r => r.data),

    // Loans
    migrateLoanDisbursement: (data: HistoricalLoanDisbursementRequest): Promise<MigrateLoanResponse> =>
        apiClient.post('/migration/loans/disburse', data).then(r => r.data),

    migrateLoanRepayment: (data: HistoricalLoanRepaymentRequest): Promise<string> =>
        apiClient.post('/migration/loans/repay', data).then(r => r.data),

    getActiveLoanId: (memberNumber: string): Promise<ActiveLoanResponse> =>
        apiClient.get(`/migration/loans/active/${memberNumber}`).then(r => r.data),

    // Penalties
    migrateHistoricalPenalty: (data: HistoricalPenaltyRequest): Promise<{ message: string }> =>
        apiClient.post('/migration/penalties/apply', data).then(r => r.data),

    // Cron / evaluation
    runCronEvaluation: (data: CronEvaluationRequest): Promise<CronEvaluationResponse> =>
        apiClient.post('/migration/cron/evaluate-penalties', data).then(r => r.data),
};