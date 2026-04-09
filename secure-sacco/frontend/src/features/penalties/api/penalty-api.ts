import apiClient from '../../../shared/api/api-client';

export interface PenaltySummary {
    id: string; ruleCode: string; ruleName: string;
    originalAmount: number; outstandingAmount: number;
    principalPaid: number; interestPaid: number; amountWaived: number;
    status: string; createdAt: string;
}

export interface StaffPenalty {
    id: string; memberId: string; memberNumber: string; memberName: string;
    ruleCode: string; ruleName: string;
    originalAmount: number; outstandingAmount: number; amountWaived: number;
    status: string; createdAt: string;
}

export type AmountType   = 'FIXED' | 'PERCENTAGE';
export type InterestMode = 'NONE' | 'FLAT' | 'SIMPLE' | 'COMPOUND';

export interface PenaltyRule {
    id: string; code: string; name: string; description?: string;
    baseAmountType: AmountType; baseAmountValue: number;
    gracePeriodDays: number; interestPeriodDays: number;
    interestRate: number; interestMode: InterestMode; isActive: boolean;
}

export interface PenaltyRuleRequest {
    code: string; name: string; description?: string;
    baseAmountType: AmountType; baseAmountValue: number;
    gracePeriodDays: number; interestPeriodDays: number;
    interestRate: number; interestMode: InterestMode; isActive?: boolean;
}

export const penaltyApi = {
    // Member
    getMyOpenPenalties:  (): Promise<PenaltySummary[]>  => apiClient.get<PenaltySummary[]>('/penalties/my').then(r => r.data),
    repayPenalty: (data: { phoneNumber: string; amount: number; penaltyId?: string | null }) =>
        apiClient.post<{ checkoutRequestID: string }>('/penalties/repay', data).then(r => r.data),

    // Staff
    getAllOpenPenalties: (): Promise<StaffPenalty[]> =>
        apiClient.get<StaffPenalty[]>('/penalties/staff').then(r => r.data),
    waivePenalty: (id: string, data: { amount: number; reason: string }): Promise<PenaltySummary> =>
        apiClient.post<PenaltySummary>(`/penalties/${id}/waive`, data).then(r => r.data),

    // Rules
    getRules:   (activeOnly = false): Promise<PenaltyRule[]>  => apiClient.get<PenaltyRule[]>(`/penalties/rules?activeOnly=${activeOnly}`).then(r => r.data),
    createRule: (data: PenaltyRuleRequest): Promise<PenaltyRule> => apiClient.post<PenaltyRule>('/penalties/rules', data).then(r => r.data),
    updateRule: (id: string, data: PenaltyRuleRequest): Promise<PenaltyRule> => apiClient.put<PenaltyRule>(`/penalties/rules/${id}`, data).then(r => r.data),
};