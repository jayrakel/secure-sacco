import apiClient from '../../../shared/api/api-client';

// ─── Member-facing types ──────────────────────────────────────────────────────

export interface PenaltySummary {
    id: string;
    ruleCode: string;
    ruleName: string;
    originalAmount: number;
    outstandingAmount: number;
    principalPaid: number;
    interestPaid: number;
    amountWaived: number;
    status: string;
    createdAt: string;
}

// ─── Admin rule management ────────────────────────────────────────────────────

export type AmountType  = 'FIXED' | 'PERCENTAGE';
export type InterestMode = 'NONE' | 'FLAT' | 'SIMPLE' | 'COMPOUND';

export interface PenaltyRule {
    id: string;
    code: string;
    name: string;
    description?: string;
    baseAmountType: AmountType;
    baseAmountValue: number;
    gracePeriodDays: number;
    interestPeriodDays: number;
    interestRate: number;
    interestMode: InterestMode;
    isActive: boolean;
}

export interface PenaltyRuleRequest {
    code: string;
    name: string;
    description?: string;
    baseAmountType: AmountType;
    baseAmountValue: number;
    gracePeriodDays: number;
    interestPeriodDays: number;
    interestRate: number;
    interestMode: InterestMode;
    isActive?: boolean;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const penaltyApi = {
    // Member
    getMyOpenPenalties: () =>
        apiClient.get<PenaltySummary[]>('/penalties/my').then(r => r.data),

    repayPenalty: (data: { phoneNumber: string; amount: number; penaltyId?: string | null }) =>
        apiClient.post<{ checkoutRequestID: string }>('/penalties/repay', data).then(r => r.data),

    // Admin — penalty rules CRUD
    getRules: (activeOnly = false): Promise<PenaltyRule[]> =>
        apiClient.get<PenaltyRule[]>(`/penalties/rules?activeOnly=${activeOnly}`).then(r => r.data),

    createRule: (data: PenaltyRuleRequest): Promise<PenaltyRule> =>
        apiClient.post<PenaltyRule>('/penalties/rules', data).then(r => r.data),

    updateRule: (id: string, data: PenaltyRuleRequest): Promise<PenaltyRule> =>
        apiClient.put<PenaltyRule>(`/penalties/rules/${id}`, data).then(r => r.data),
};